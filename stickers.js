/* ============================================================================
   MyCRM — stickers.js · label engine + template editor + station printing (v13.81)
   Loaded lazily by index.html (admin: Brand Profiles → 🏷 Label templates; packer: 🏷 Print on a batch).
   Uses the page's globals: sb (PostgREST client), toast, escAttr, currentUser, clients.
   Template = data (public.label_templates): one per seller + 'default'. Label size per template (default 55 × 50 mm), positions in mm.
   Embeds qrcode-generator 1.4.4 (c) Kazuhiko Arase, MIT — see below.
   ============================================================================ */
(function () {
'use strict';
const STICKERS_VERSION = '1.3';
//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

var qrcode = function() {

  //---------------------------------------------------------------------
  // qrcode
  //---------------------------------------------------------------------

  /**
   * qrcode
   * @param typeNumber 1 to 40
   * @param errorCorrectionLevel 'L','M','Q','H'
   */
  var qrcode = function(typeNumber, errorCorrectionLevel) {

    var PAD0 = 0xEC;
    var PAD1 = 0x11;

    var _typeNumber = typeNumber;
    var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
    var _modules = null;
    var _moduleCount = 0;
    var _dataCache = null;
    var _dataList = [];

    var _this = {};

    var makeImpl = function(test, maskPattern) {

      _moduleCount = _typeNumber * 4 + 17;
      _modules = function(moduleCount) {
        var modules = new Array(moduleCount);
        for (var row = 0; row < moduleCount; row += 1) {
          modules[row] = new Array(moduleCount);
          for (var col = 0; col < moduleCount; col += 1) {
            modules[row][col] = null;
          }
        }
        return modules;
      }(_moduleCount);

      setupPositionProbePattern(0, 0);
      setupPositionProbePattern(_moduleCount - 7, 0);
      setupPositionProbePattern(0, _moduleCount - 7);
      setupPositionAdjustPattern();
      setupTimingPattern();
      setupTypeInfo(test, maskPattern);

      if (_typeNumber >= 7) {
        setupTypeNumber(test);
      }

      if (_dataCache == null) {
        _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
      }

      mapData(_dataCache, maskPattern);
    };

    var setupPositionProbePattern = function(row, col) {

      for (var r = -1; r <= 7; r += 1) {

        if (row + r <= -1 || _moduleCount <= row + r) continue;

        for (var c = -1; c <= 7; c += 1) {

          if (col + c <= -1 || _moduleCount <= col + c) continue;

          if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
              || (0 <= c && c <= 6 && (r == 0 || r == 6) )
              || (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
            _modules[row + r][col + c] = true;
          } else {
            _modules[row + r][col + c] = false;
          }
        }
      }
    };

    var getBestMaskPattern = function() {

      var minLostPoint = 0;
      var pattern = 0;

      for (var i = 0; i < 8; i += 1) {

        makeImpl(true, i);

        var lostPoint = QRUtil.getLostPoint(_this);

        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }

      return pattern;
    };

    var setupTimingPattern = function() {

      for (var r = 8; r < _moduleCount - 8; r += 1) {
        if (_modules[r][6] != null) {
          continue;
        }
        _modules[r][6] = (r % 2 == 0);
      }

      for (var c = 8; c < _moduleCount - 8; c += 1) {
        if (_modules[6][c] != null) {
          continue;
        }
        _modules[6][c] = (c % 2 == 0);
      }
    };

    var setupPositionAdjustPattern = function() {

      var pos = QRUtil.getPatternPosition(_typeNumber);

      for (var i = 0; i < pos.length; i += 1) {

        for (var j = 0; j < pos.length; j += 1) {

          var row = pos[i];
          var col = pos[j];

          if (_modules[row][col] != null) {
            continue;
          }

          for (var r = -2; r <= 2; r += 1) {

            for (var c = -2; c <= 2; c += 1) {

              if (r == -2 || r == 2 || c == -2 || c == 2
                  || (r == 0 && c == 0) ) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    };

    var setupTypeNumber = function(test) {

      var bits = QRUtil.getBCHTypeNumber(_typeNumber);

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    };

    var setupTypeInfo = function(test, maskPattern) {

      var data = (_errorCorrectionLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);

      // vertical
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 6) {
          _modules[i][8] = mod;
        } else if (i < 8) {
          _modules[i + 1][8] = mod;
        } else {
          _modules[_moduleCount - 15 + i][8] = mod;
        }
      }

      // horizontal
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 8) {
          _modules[8][_moduleCount - i - 1] = mod;
        } else if (i < 9) {
          _modules[8][15 - i - 1 + 1] = mod;
        } else {
          _modules[8][15 - i - 1] = mod;
        }
      }

      // fixed module
      _modules[_moduleCount - 8][8] = (!test);
    };

    var mapData = function(data, maskPattern) {

      var inc = -1;
      var row = _moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      var maskFunc = QRUtil.getMaskFunction(maskPattern);

      for (var col = _moduleCount - 1; col > 0; col -= 2) {

        if (col == 6) col -= 1;

        while (true) {

          for (var c = 0; c < 2; c += 1) {

            if (_modules[row][col - c] == null) {

              var dark = false;

              if (byteIndex < data.length) {
                dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
              }

              var mask = maskFunc(row, col - c);

              if (mask) {
                dark = !dark;
              }

              _modules[row][col - c] = dark;
              bitIndex -= 1;

              if (bitIndex == -1) {
                byteIndex += 1;
                bitIndex = 7;
              }
            }
          }

          row += inc;

          if (row < 0 || _moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    };

    var createBytes = function(buffer, rsBlocks) {

      var offset = 0;

      var maxDcCount = 0;
      var maxEcCount = 0;

      var dcdata = new Array(rsBlocks.length);
      var ecdata = new Array(rsBlocks.length);

      for (var r = 0; r < rsBlocks.length; r += 1) {

        var dcCount = rsBlocks[r].dataCount;
        var ecCount = rsBlocks[r].totalCount - dcCount;

        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);

        dcdata[r] = new Array(dcCount);

        for (var i = 0; i < dcdata[r].length; i += 1) {
          dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
        }
        offset += dcCount;

        var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

        var modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (var i = 0; i < ecdata[r].length; i += 1) {
          var modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
        }
      }

      var totalCodeCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalCodeCount += rsBlocks[i].totalCount;
      }

      var data = new Array(totalCodeCount);
      var index = 0;

      for (var i = 0; i < maxDcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < dcdata[r].length) {
            data[index] = dcdata[r][i];
            index += 1;
          }
        }
      }

      for (var i = 0; i < maxEcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < ecdata[r].length) {
            data[index] = ecdata[r][i];
            index += 1;
          }
        }
      }

      return data;
    };

    var createData = function(typeNumber, errorCorrectionLevel, dataList) {

      var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

      var buffer = qrBitBuffer();

      for (var i = 0; i < dataList.length; i += 1) {
        var data = dataList[i];
        buffer.put(data.getMode(), 4);
        buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
        data.write(buffer);
      }

      // calc num max data.
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalDataCount += rsBlocks[i].dataCount;
      }

      if (buffer.getLengthInBits() > totalDataCount * 8) {
        throw 'code length overflow. ('
          + buffer.getLengthInBits()
          + '>'
          + totalDataCount * 8
          + ')';
      }

      // end code
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
        buffer.put(0, 4);
      }

      // padding
      while (buffer.getLengthInBits() % 8 != 0) {
        buffer.putBit(false);
      }

      // padding
      while (true) {

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD0, 8);

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD1, 8);
      }

      return createBytes(buffer, rsBlocks);
    };

    _this.addData = function(data, mode) {

      mode = mode || 'Byte';

      var newData = null;

      switch(mode) {
      case 'Numeric' :
        newData = qrNumber(data);
        break;
      case 'Alphanumeric' :
        newData = qrAlphaNum(data);
        break;
      case 'Byte' :
        newData = qr8BitByte(data);
        break;
      case 'Kanji' :
        newData = qrKanji(data);
        break;
      default :
        throw 'mode:' + mode;
      }

      _dataList.push(newData);
      _dataCache = null;
    };

    _this.isDark = function(row, col) {
      if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
        throw row + ',' + col;
      }
      return _modules[row][col];
    };

    _this.getModuleCount = function() {
      return _moduleCount;
    };

    _this.make = function() {
      if (_typeNumber < 1) {
        var typeNumber = 1;

        for (; typeNumber < 40; typeNumber++) {
          var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
          var buffer = qrBitBuffer();

          for (var i = 0; i < _dataList.length; i++) {
            var data = _dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
            data.write(buffer);
          }

          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i++) {
            totalDataCount += rsBlocks[i].dataCount;
          }

          if (buffer.getLengthInBits() <= totalDataCount * 8) {
            break;
          }
        }

        _typeNumber = typeNumber;
      }

      makeImpl(false, getBestMaskPattern() );
    };

    _this.createTableTag = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var qrHtml = '';

      qrHtml += '<table style="';
      qrHtml += ' border-width: 0px; border-style: none;';
      qrHtml += ' border-collapse: collapse;';
      qrHtml += ' padding: 0px; margin: ' + margin + 'px;';
      qrHtml += '">';
      qrHtml += '<tbody>';

      for (var r = 0; r < _this.getModuleCount(); r += 1) {

        qrHtml += '<tr>';

        for (var c = 0; c < _this.getModuleCount(); c += 1) {
          qrHtml += '<td style="';
          qrHtml += ' border-width: 0px; border-style: none;';
          qrHtml += ' border-collapse: collapse;';
          qrHtml += ' padding: 0px; margin: 0px;';
          qrHtml += ' width: ' + cellSize + 'px;';
          qrHtml += ' height: ' + cellSize + 'px;';
          qrHtml += ' background-color: ';
          qrHtml += _this.isDark(r, c)? '#000000' : '#ffffff';
          qrHtml += ';';
          qrHtml += '"/>';
        }

        qrHtml += '</tr>';
      }

      qrHtml += '</tbody>';
      qrHtml += '</table>';

      return qrHtml;
    };

    _this.createSvgTag = function(cellSize, margin, alt, title) {

      var opts = {};
      if (typeof arguments[0] == 'object') {
        // Called by options.
        opts = arguments[0];
        // overwrite cellSize and margin.
        cellSize = opts.cellSize;
        margin = opts.margin;
        alt = opts.alt;
        title = opts.title;
      }

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      // Compose alt property surrogate
      alt = (typeof alt === 'string') ? {text: alt} : alt || {};
      alt.text = alt.text || null;
      alt.id = (alt.text) ? alt.id || 'qrcode-description' : null;

      // Compose title property surrogate
      title = (typeof title === 'string') ? {text: title} : title || {};
      title.text = title.text || null;
      title.id = (title.text) ? title.id || 'qrcode-title' : null;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var c, mc, r, mr, qrSvg='', rect;

      rect = 'l' + cellSize + ',0 0,' + cellSize +
        ' -' + cellSize + ',0 0,-' + cellSize + 'z ';

      qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
      qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : '';
      qrSvg += ' viewBox="0 0 ' + size + ' ' + size + '" ';
      qrSvg += ' preserveAspectRatio="xMinYMin meet"';
      qrSvg += (title.text || alt.text) ? ' role="img" aria-labelledby="' +
          escapeXml([title.id, alt.id].join(' ').trim() ) + '"' : '';
      qrSvg += '>';
      qrSvg += (title.text) ? '<title id="' + escapeXml(title.id) + '">' +
          escapeXml(title.text) + '</title>' : '';
      qrSvg += (alt.text) ? '<description id="' + escapeXml(alt.id) + '">' +
          escapeXml(alt.text) + '</description>' : '';
      qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
      qrSvg += '<path d="';

      for (r = 0; r < _this.getModuleCount(); r += 1) {
        mr = r * cellSize + margin;
        for (c = 0; c < _this.getModuleCount(); c += 1) {
          if (_this.isDark(r, c) ) {
            mc = c*cellSize+margin;
            qrSvg += 'M' + mc + ',' + mr + rect;
          }
        }
      }

      qrSvg += '" stroke="transparent" fill="black"/>';
      qrSvg += '</svg>';

      return qrSvg;
    };

    _this.createDataURL = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      return createDataURL(size, size, function(x, y) {
        if (min <= x && x < max && min <= y && y < max) {
          var c = Math.floor( (x - min) / cellSize);
          var r = Math.floor( (y - min) / cellSize);
          return _this.isDark(r, c)? 0 : 1;
        } else {
          return 1;
        }
      } );
    };

    _this.createImgTag = function(cellSize, margin, alt) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;

      var img = '';
      img += '<img';
      img += '\u0020src="';
      img += _this.createDataURL(cellSize, margin);
      img += '"';
      img += '\u0020width="';
      img += size;
      img += '"';
      img += '\u0020height="';
      img += size;
      img += '"';
      if (alt) {
        img += '\u0020alt="';
        img += escapeXml(alt);
        img += '"';
      }
      img += '/>';

      return img;
    };

    var escapeXml = function(s) {
      var escaped = '';
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charAt(i);
        switch(c) {
        case '<': escaped += '&lt;'; break;
        case '>': escaped += '&gt;'; break;
        case '&': escaped += '&amp;'; break;
        case '"': escaped += '&quot;'; break;
        default : escaped += c; break;
        }
      }
      return escaped;
    };

    var _createHalfASCII = function(margin) {
      var cellSize = 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r1, r2, p;

      var blocks = {
        '██': '█',
        '█ ': '▀',
        ' █': '▄',
        '  ': ' '
      };

      var blocksLastLineNoMargin = {
        '██': '▀',
        '█ ': '▀',
        ' █': ' ',
        '  ': ' '
      };

      var ascii = '';
      for (y = 0; y < size; y += 2) {
        r1 = Math.floor((y - min) / cellSize);
        r2 = Math.floor((y + 1 - min) / cellSize);
        for (x = 0; x < size; x += 1) {
          p = '█';

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
            p = ' ';
          }

          if (min <= x && x < max && min <= y+1 && y+1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
            p += ' ';
          }
          else {
            p += '█';
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          ascii += (margin < 1 && y+1 >= max) ? blocksLastLineNoMargin[p] : blocks[p];
        }

        ascii += '\n';
      }

      if (size % 2 && margin > 0) {
        return ascii.substring(0, ascii.length - size - 1) + Array(size+1).join('▀');
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.createASCII = function(cellSize, margin) {
      cellSize = cellSize || 1;

      if (cellSize < 2) {
        return _createHalfASCII(margin);
      }

      cellSize -= 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r, p;

      var white = Array(cellSize+1).join('██');
      var black = Array(cellSize+1).join('  ');

      var ascii = '';
      var line = '';
      for (y = 0; y < size; y += 1) {
        r = Math.floor( (y - min) / cellSize);
        line = '';
        for (x = 0; x < size; x += 1) {
          p = 1;

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
            p = 0;
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          line += p ? white : black;
        }

        for (r = 0; r < cellSize; r += 1) {
          ascii += line + '\n';
        }
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.renderTo2dContext = function(context, cellSize) {
      cellSize = cellSize || 2;
      var length = _this.getModuleCount();
      for (var row = 0; row < length; row++) {
        for (var col = 0; col < length; col++) {
          context.fillStyle = _this.isDark(row, col) ? 'black' : 'white';
          context.fillRect(row * cellSize, col * cellSize, cellSize, cellSize);
        }
      }
    }

    return _this;
  };

  //---------------------------------------------------------------------
  // qrcode.stringToBytes
  //---------------------------------------------------------------------

  qrcode.stringToBytesFuncs = {
    'default' : function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        bytes.push(c & 0xff);
      }
      return bytes;
    }
  };

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['default'];

  //---------------------------------------------------------------------
  // qrcode.createStringToBytes
  //---------------------------------------------------------------------

  /**
   * @param unicodeData base64 string of byte array.
   * [16bit Unicode],[16bit Bytes], ...
   * @param numChars
   */
  qrcode.createStringToBytes = function(unicodeData, numChars) {

    // create conversion map.

    var unicodeMap = function() {

      var bin = base64DecodeInputStream(unicodeData);
      var read = function() {
        var b = bin.read();
        if (b == -1) throw 'eof';
        return b;
      };

      var count = 0;
      var unicodeMap = {};
      while (true) {
        var b0 = bin.read();
        if (b0 == -1) break;
        var b1 = read();
        var b2 = read();
        var b3 = read();
        var k = String.fromCharCode( (b0 << 8) | b1);
        var v = (b2 << 8) | b3;
        unicodeMap[k] = v;
        count += 1;
      }
      if (count != numChars) {
        throw count + ' != ' + numChars;
      }

      return unicodeMap;
    }();

    var unknownChar = '?'.charCodeAt(0);

    return function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        if (c < 128) {
          bytes.push(c);
        } else {
          var b = unicodeMap[s.charAt(i)];
          if (typeof b == 'number') {
            if ( (b & 0xff) == b) {
              // 1byte
              bytes.push(b);
            } else {
              // 2bytes
              bytes.push(b >>> 8);
              bytes.push(b & 0xff);
            }
          } else {
            bytes.push(unknownChar);
          }
        }
      }
      return bytes;
    };
  };

  //---------------------------------------------------------------------
  // QRMode
  //---------------------------------------------------------------------

  var QRMode = {
    MODE_NUMBER :    1 << 0,
    MODE_ALPHA_NUM : 1 << 1,
    MODE_8BIT_BYTE : 1 << 2,
    MODE_KANJI :     1 << 3
  };

  //---------------------------------------------------------------------
  // QRErrorCorrectionLevel
  //---------------------------------------------------------------------

  var QRErrorCorrectionLevel = {
    L : 1,
    M : 0,
    Q : 3,
    H : 2
  };

  //---------------------------------------------------------------------
  // QRMaskPattern
  //---------------------------------------------------------------------

  var QRMaskPattern = {
    PATTERN000 : 0,
    PATTERN001 : 1,
    PATTERN010 : 2,
    PATTERN011 : 3,
    PATTERN100 : 4,
    PATTERN101 : 5,
    PATTERN110 : 6,
    PATTERN111 : 7
  };

  //---------------------------------------------------------------------
  // QRUtil
  //---------------------------------------------------------------------

  var QRUtil = function() {

    var PATTERN_POSITION_TABLE = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ];
    var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

    var _this = {};

    var getBCHDigit = function(data) {
      var digit = 0;
      while (data != 0) {
        digit += 1;
        data >>>= 1;
      }
      return digit;
    };

    _this.getBCHTypeInfo = function(data) {
      var d = data << 10;
      while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
        d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
      }
      return ( (data << 10) | d) ^ G15_MASK;
    };

    _this.getBCHTypeNumber = function(data) {
      var d = data << 12;
      while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
        d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
      }
      return (data << 12) | d;
    };

    _this.getPatternPosition = function(typeNumber) {
      return PATTERN_POSITION_TABLE[typeNumber - 1];
    };

    _this.getMaskFunction = function(maskPattern) {

      switch (maskPattern) {

      case QRMaskPattern.PATTERN000 :
        return function(i, j) { return (i + j) % 2 == 0; };
      case QRMaskPattern.PATTERN001 :
        return function(i, j) { return i % 2 == 0; };
      case QRMaskPattern.PATTERN010 :
        return function(i, j) { return j % 3 == 0; };
      case QRMaskPattern.PATTERN011 :
        return function(i, j) { return (i + j) % 3 == 0; };
      case QRMaskPattern.PATTERN100 :
        return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
      case QRMaskPattern.PATTERN101 :
        return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
      case QRMaskPattern.PATTERN110 :
        return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
      case QRMaskPattern.PATTERN111 :
        return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

      default :
        throw 'bad maskPattern:' + maskPattern;
      }
    };

    _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
      var a = qrPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i += 1) {
        a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
      }
      return a;
    };

    _this.getLengthInBits = function(mode, type) {

      if (1 <= type && type < 10) {

        // 1 - 9

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 10;
        case QRMode.MODE_ALPHA_NUM : return 9;
        case QRMode.MODE_8BIT_BYTE : return 8;
        case QRMode.MODE_KANJI     : return 8;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 27) {

        // 10 - 26

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 12;
        case QRMode.MODE_ALPHA_NUM : return 11;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 10;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 41) {

        // 27 - 40

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 14;
        case QRMode.MODE_ALPHA_NUM : return 13;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 12;
        default :
          throw 'mode:' + mode;
        }

      } else {
        throw 'type:' + type;
      }
    };

    _this.getLostPoint = function(qrcode) {

      var moduleCount = qrcode.getModuleCount();

      var lostPoint = 0;

      // LEVEL1

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount; col += 1) {

          var sameCount = 0;
          var dark = qrcode.isDark(row, col);

          for (var r = -1; r <= 1; r += 1) {

            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }

            for (var c = -1; c <= 1; c += 1) {

              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }

              if (r == 0 && c == 0) {
                continue;
              }

              if (dark == qrcode.isDark(row + r, col + c) ) {
                sameCount += 1;
              }
            }
          }

          if (sameCount > 5) {
            lostPoint += (3 + sameCount - 5);
          }
        }
      };

      // LEVEL2

      for (var row = 0; row < moduleCount - 1; row += 1) {
        for (var col = 0; col < moduleCount - 1; col += 1) {
          var count = 0;
          if (qrcode.isDark(row, col) ) count += 1;
          if (qrcode.isDark(row + 1, col) ) count += 1;
          if (qrcode.isDark(row, col + 1) ) count += 1;
          if (qrcode.isDark(row + 1, col + 1) ) count += 1;
          if (count == 0 || count == 4) {
            lostPoint += 3;
          }
        }
      }

      // LEVEL3

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount - 6; col += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row, col + 1)
              &&  qrcode.isDark(row, col + 2)
              &&  qrcode.isDark(row, col + 3)
              &&  qrcode.isDark(row, col + 4)
              && !qrcode.isDark(row, col + 5)
              &&  qrcode.isDark(row, col + 6) ) {
            lostPoint += 40;
          }
        }
      }

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount - 6; row += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row + 1, col)
              &&  qrcode.isDark(row + 2, col)
              &&  qrcode.isDark(row + 3, col)
              &&  qrcode.isDark(row + 4, col)
              && !qrcode.isDark(row + 5, col)
              &&  qrcode.isDark(row + 6, col) ) {
            lostPoint += 40;
          }
        }
      }

      // LEVEL4

      var darkCount = 0;

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount; row += 1) {
          if (qrcode.isDark(row, col) ) {
            darkCount += 1;
          }
        }
      }

      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;

      return lostPoint;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // QRMath
  //---------------------------------------------------------------------

  var QRMath = function() {

    var EXP_TABLE = new Array(256);
    var LOG_TABLE = new Array(256);

    // initialize tables
    for (var i = 0; i < 8; i += 1) {
      EXP_TABLE[i] = 1 << i;
    }
    for (var i = 8; i < 256; i += 1) {
      EXP_TABLE[i] = EXP_TABLE[i - 4]
        ^ EXP_TABLE[i - 5]
        ^ EXP_TABLE[i - 6]
        ^ EXP_TABLE[i - 8];
    }
    for (var i = 0; i < 255; i += 1) {
      LOG_TABLE[EXP_TABLE[i] ] = i;
    }

    var _this = {};

    _this.glog = function(n) {

      if (n < 1) {
        throw 'glog(' + n + ')';
      }

      return LOG_TABLE[n];
    };

    _this.gexp = function(n) {

      while (n < 0) {
        n += 255;
      }

      while (n >= 256) {
        n -= 255;
      }

      return EXP_TABLE[n];
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrPolynomial
  //---------------------------------------------------------------------

  function qrPolynomial(num, shift) {

    if (typeof num.length == 'undefined') {
      throw num.length + '/' + shift;
    }

    var _num = function() {
      var offset = 0;
      while (offset < num.length && num[offset] == 0) {
        offset += 1;
      }
      var _num = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i += 1) {
        _num[i] = num[i + offset];
      }
      return _num;
    }();

    var _this = {};

    _this.getAt = function(index) {
      return _num[index];
    };

    _this.getLength = function() {
      return _num.length;
    };

    _this.multiply = function(e) {

      var num = new Array(_this.getLength() + e.getLength() - 1);

      for (var i = 0; i < _this.getLength(); i += 1) {
        for (var j = 0; j < e.getLength(); j += 1) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i) ) + QRMath.glog(e.getAt(j) ) );
        }
      }

      return qrPolynomial(num, 0);
    };

    _this.mod = function(e) {

      if (_this.getLength() - e.getLength() < 0) {
        return _this;
      }

      var ratio = QRMath.glog(_this.getAt(0) ) - QRMath.glog(e.getAt(0) );

      var num = new Array(_this.getLength() );
      for (var i = 0; i < _this.getLength(); i += 1) {
        num[i] = _this.getAt(i);
      }

      for (var i = 0; i < e.getLength(); i += 1) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i) ) + ratio);
      }

      // recursive call
      return qrPolynomial(num, 0).mod(e);
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // QRRSBlock
  //---------------------------------------------------------------------

  var QRRSBlock = function() {

    var RS_BLOCK_TABLE = [

      // L
      // M
      // Q
      // H

      // 1
      [1, 26, 19],
      [1, 26, 16],
      [1, 26, 13],
      [1, 26, 9],

      // 2
      [1, 44, 34],
      [1, 44, 28],
      [1, 44, 22],
      [1, 44, 16],

      // 3
      [1, 70, 55],
      [1, 70, 44],
      [2, 35, 17],
      [2, 35, 13],

      // 4
      [1, 100, 80],
      [2, 50, 32],
      [2, 50, 24],
      [4, 25, 9],

      // 5
      [1, 134, 108],
      [2, 67, 43],
      [2, 33, 15, 2, 34, 16],
      [2, 33, 11, 2, 34, 12],

      // 6
      [2, 86, 68],
      [4, 43, 27],
      [4, 43, 19],
      [4, 43, 15],

      // 7
      [2, 98, 78],
      [4, 49, 31],
      [2, 32, 14, 4, 33, 15],
      [4, 39, 13, 1, 40, 14],

      // 8
      [2, 121, 97],
      [2, 60, 38, 2, 61, 39],
      [4, 40, 18, 2, 41, 19],
      [4, 40, 14, 2, 41, 15],

      // 9
      [2, 146, 116],
      [3, 58, 36, 2, 59, 37],
      [4, 36, 16, 4, 37, 17],
      [4, 36, 12, 4, 37, 13],

      // 10
      [2, 86, 68, 2, 87, 69],
      [4, 69, 43, 1, 70, 44],
      [6, 43, 19, 2, 44, 20],
      [6, 43, 15, 2, 44, 16],

      // 11
      [4, 101, 81],
      [1, 80, 50, 4, 81, 51],
      [4, 50, 22, 4, 51, 23],
      [3, 36, 12, 8, 37, 13],

      // 12
      [2, 116, 92, 2, 117, 93],
      [6, 58, 36, 2, 59, 37],
      [4, 46, 20, 6, 47, 21],
      [7, 42, 14, 4, 43, 15],

      // 13
      [4, 133, 107],
      [8, 59, 37, 1, 60, 38],
      [8, 44, 20, 4, 45, 21],
      [12, 33, 11, 4, 34, 12],

      // 14
      [3, 145, 115, 1, 146, 116],
      [4, 64, 40, 5, 65, 41],
      [11, 36, 16, 5, 37, 17],
      [11, 36, 12, 5, 37, 13],

      // 15
      [5, 109, 87, 1, 110, 88],
      [5, 65, 41, 5, 66, 42],
      [5, 54, 24, 7, 55, 25],
      [11, 36, 12, 7, 37, 13],

      // 16
      [5, 122, 98, 1, 123, 99],
      [7, 73, 45, 3, 74, 46],
      [15, 43, 19, 2, 44, 20],
      [3, 45, 15, 13, 46, 16],

      // 17
      [1, 135, 107, 5, 136, 108],
      [10, 74, 46, 1, 75, 47],
      [1, 50, 22, 15, 51, 23],
      [2, 42, 14, 17, 43, 15],

      // 18
      [5, 150, 120, 1, 151, 121],
      [9, 69, 43, 4, 70, 44],
      [17, 50, 22, 1, 51, 23],
      [2, 42, 14, 19, 43, 15],

      // 19
      [3, 141, 113, 4, 142, 114],
      [3, 70, 44, 11, 71, 45],
      [17, 47, 21, 4, 48, 22],
      [9, 39, 13, 16, 40, 14],

      // 20
      [3, 135, 107, 5, 136, 108],
      [3, 67, 41, 13, 68, 42],
      [15, 54, 24, 5, 55, 25],
      [15, 43, 15, 10, 44, 16],

      // 21
      [4, 144, 116, 4, 145, 117],
      [17, 68, 42],
      [17, 50, 22, 6, 51, 23],
      [19, 46, 16, 6, 47, 17],

      // 22
      [2, 139, 111, 7, 140, 112],
      [17, 74, 46],
      [7, 54, 24, 16, 55, 25],
      [34, 37, 13],

      // 23
      [4, 151, 121, 5, 152, 122],
      [4, 75, 47, 14, 76, 48],
      [11, 54, 24, 14, 55, 25],
      [16, 45, 15, 14, 46, 16],

      // 24
      [6, 147, 117, 4, 148, 118],
      [6, 73, 45, 14, 74, 46],
      [11, 54, 24, 16, 55, 25],
      [30, 46, 16, 2, 47, 17],

      // 25
      [8, 132, 106, 4, 133, 107],
      [8, 75, 47, 13, 76, 48],
      [7, 54, 24, 22, 55, 25],
      [22, 45, 15, 13, 46, 16],

      // 26
      [10, 142, 114, 2, 143, 115],
      [19, 74, 46, 4, 75, 47],
      [28, 50, 22, 6, 51, 23],
      [33, 46, 16, 4, 47, 17],

      // 27
      [8, 152, 122, 4, 153, 123],
      [22, 73, 45, 3, 74, 46],
      [8, 53, 23, 26, 54, 24],
      [12, 45, 15, 28, 46, 16],

      // 28
      [3, 147, 117, 10, 148, 118],
      [3, 73, 45, 23, 74, 46],
      [4, 54, 24, 31, 55, 25],
      [11, 45, 15, 31, 46, 16],

      // 29
      [7, 146, 116, 7, 147, 117],
      [21, 73, 45, 7, 74, 46],
      [1, 53, 23, 37, 54, 24],
      [19, 45, 15, 26, 46, 16],

      // 30
      [5, 145, 115, 10, 146, 116],
      [19, 75, 47, 10, 76, 48],
      [15, 54, 24, 25, 55, 25],
      [23, 45, 15, 25, 46, 16],

      // 31
      [13, 145, 115, 3, 146, 116],
      [2, 74, 46, 29, 75, 47],
      [42, 54, 24, 1, 55, 25],
      [23, 45, 15, 28, 46, 16],

      // 32
      [17, 145, 115],
      [10, 74, 46, 23, 75, 47],
      [10, 54, 24, 35, 55, 25],
      [19, 45, 15, 35, 46, 16],

      // 33
      [17, 145, 115, 1, 146, 116],
      [14, 74, 46, 21, 75, 47],
      [29, 54, 24, 19, 55, 25],
      [11, 45, 15, 46, 46, 16],

      // 34
      [13, 145, 115, 6, 146, 116],
      [14, 74, 46, 23, 75, 47],
      [44, 54, 24, 7, 55, 25],
      [59, 46, 16, 1, 47, 17],

      // 35
      [12, 151, 121, 7, 152, 122],
      [12, 75, 47, 26, 76, 48],
      [39, 54, 24, 14, 55, 25],
      [22, 45, 15, 41, 46, 16],

      // 36
      [6, 151, 121, 14, 152, 122],
      [6, 75, 47, 34, 76, 48],
      [46, 54, 24, 10, 55, 25],
      [2, 45, 15, 64, 46, 16],

      // 37
      [17, 152, 122, 4, 153, 123],
      [29, 74, 46, 14, 75, 47],
      [49, 54, 24, 10, 55, 25],
      [24, 45, 15, 46, 46, 16],

      // 38
      [4, 152, 122, 18, 153, 123],
      [13, 74, 46, 32, 75, 47],
      [48, 54, 24, 14, 55, 25],
      [42, 45, 15, 32, 46, 16],

      // 39
      [20, 147, 117, 4, 148, 118],
      [40, 75, 47, 7, 76, 48],
      [43, 54, 24, 22, 55, 25],
      [10, 45, 15, 67, 46, 16],

      // 40
      [19, 148, 118, 6, 149, 119],
      [18, 75, 47, 31, 76, 48],
      [34, 54, 24, 34, 55, 25],
      [20, 45, 15, 61, 46, 16]
    ];

    var qrRSBlock = function(totalCount, dataCount) {
      var _this = {};
      _this.totalCount = totalCount;
      _this.dataCount = dataCount;
      return _this;
    };

    var _this = {};

    var getRsBlockTable = function(typeNumber, errorCorrectionLevel) {

      switch(errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default :
        return undefined;
      }
    };

    _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {

      var rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);

      if (typeof rsBlock == 'undefined') {
        throw 'bad rs block @ typeNumber:' + typeNumber +
            '/errorCorrectionLevel:' + errorCorrectionLevel;
      }

      var length = rsBlock.length / 3;

      var list = [];

      for (var i = 0; i < length; i += 1) {

        var count = rsBlock[i * 3 + 0];
        var totalCount = rsBlock[i * 3 + 1];
        var dataCount = rsBlock[i * 3 + 2];

        for (var j = 0; j < count; j += 1) {
          list.push(qrRSBlock(totalCount, dataCount) );
        }
      }

      return list;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrBitBuffer
  //---------------------------------------------------------------------

  var qrBitBuffer = function() {

    var _buffer = [];
    var _length = 0;

    var _this = {};

    _this.getBuffer = function() {
      return _buffer;
    };

    _this.getAt = function(index) {
      var bufIndex = Math.floor(index / 8);
      return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
    };

    _this.put = function(num, length) {
      for (var i = 0; i < length; i += 1) {
        _this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
      }
    };

    _this.getLengthInBits = function() {
      return _length;
    };

    _this.putBit = function(bit) {

      var bufIndex = Math.floor(_length / 8);
      if (_buffer.length <= bufIndex) {
        _buffer.push(0);
      }

      if (bit) {
        _buffer[bufIndex] |= (0x80 >>> (_length % 8) );
      }

      _length += 1;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrNumber
  //---------------------------------------------------------------------

  var qrNumber = function(data) {

    var _mode = QRMode.MODE_NUMBER;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var data = _data;

      var i = 0;

      while (i + 2 < data.length) {
        buffer.put(strToNum(data.substring(i, i + 3) ), 10);
        i += 3;
      }

      if (i < data.length) {
        if (data.length - i == 1) {
          buffer.put(strToNum(data.substring(i, i + 1) ), 4);
        } else if (data.length - i == 2) {
          buffer.put(strToNum(data.substring(i, i + 2) ), 7);
        }
      }
    };

    var strToNum = function(s) {
      var num = 0;
      for (var i = 0; i < s.length; i += 1) {
        num = num * 10 + chatToNum(s.charAt(i) );
      }
      return num;
    };

    var chatToNum = function(c) {
      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      }
      throw 'illegal char :' + c;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrAlphaNum
  //---------------------------------------------------------------------

  var qrAlphaNum = function(data) {

    var _mode = QRMode.MODE_ALPHA_NUM;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var s = _data;

      var i = 0;

      while (i + 1 < s.length) {
        buffer.put(
          getCode(s.charAt(i) ) * 45 +
          getCode(s.charAt(i + 1) ), 11);
        i += 2;
      }

      if (i < s.length) {
        buffer.put(getCode(s.charAt(i) ), 6);
      }
    };

    var getCode = function(c) {

      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      } else if ('A' <= c && c <= 'Z') {
        return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
      } else {
        switch (c) {
        case ' ' : return 36;
        case '$' : return 37;
        case '%' : return 38;
        case '*' : return 39;
        case '+' : return 40;
        case '-' : return 41;
        case '.' : return 42;
        case '/' : return 43;
        case ':' : return 44;
        default :
          throw 'illegal char :' + c;
        }
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qr8BitByte
  //---------------------------------------------------------------------

  var qr8BitByte = function(data) {

    var _mode = QRMode.MODE_8BIT_BYTE;
    var _data = data;
    var _bytes = qrcode.stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _bytes.length;
    };

    _this.write = function(buffer) {
      for (var i = 0; i < _bytes.length; i += 1) {
        buffer.put(_bytes[i], 8);
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrKanji
  //---------------------------------------------------------------------

  var qrKanji = function(data) {

    var _mode = QRMode.MODE_KANJI;
    var _data = data;

    var stringToBytes = qrcode.stringToBytesFuncs['SJIS'];
    if (!stringToBytes) {
      throw 'sjis not supported.';
    }
    !function(c, code) {
      // self test for sjis support.
      var test = stringToBytes(c);
      if (test.length != 2 || ( (test[0] << 8) | test[1]) != code) {
        throw 'sjis not supported.';
      }
    }('\u53cb', 0x9746);

    var _bytes = stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return ~~(_bytes.length / 2);
    };

    _this.write = function(buffer) {

      var data = _bytes;

      var i = 0;

      while (i + 1 < data.length) {

        var c = ( (0xff & data[i]) << 8) | (0xff & data[i + 1]);

        if (0x8140 <= c && c <= 0x9FFC) {
          c -= 0x8140;
        } else if (0xE040 <= c && c <= 0xEBBF) {
          c -= 0xC140;
        } else {
          throw 'illegal char at ' + (i + 1) + '/' + c;
        }

        c = ( (c >>> 8) & 0xff) * 0xC0 + (c & 0xff);

        buffer.put(c, 13);

        i += 2;
      }

      if (i < data.length) {
        throw 'illegal char at ' + (i + 1);
      }
    };

    return _this;
  };

  //=====================================================================
  // GIF Support etc.
  //

  //---------------------------------------------------------------------
  // byteArrayOutputStream
  //---------------------------------------------------------------------

  var byteArrayOutputStream = function() {

    var _bytes = [];

    var _this = {};

    _this.writeByte = function(b) {
      _bytes.push(b & 0xff);
    };

    _this.writeShort = function(i) {
      _this.writeByte(i);
      _this.writeByte(i >>> 8);
    };

    _this.writeBytes = function(b, off, len) {
      off = off || 0;
      len = len || b.length;
      for (var i = 0; i < len; i += 1) {
        _this.writeByte(b[i + off]);
      }
    };

    _this.writeString = function(s) {
      for (var i = 0; i < s.length; i += 1) {
        _this.writeByte(s.charCodeAt(i) );
      }
    };

    _this.toByteArray = function() {
      return _bytes;
    };

    _this.toString = function() {
      var s = '';
      s += '[';
      for (var i = 0; i < _bytes.length; i += 1) {
        if (i > 0) {
          s += ',';
        }
        s += _bytes[i];
      }
      s += ']';
      return s;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64EncodeOutputStream
  //---------------------------------------------------------------------

  var base64EncodeOutputStream = function() {

    var _buffer = 0;
    var _buflen = 0;
    var _length = 0;
    var _base64 = '';

    var _this = {};

    var writeEncoded = function(b) {
      _base64 += String.fromCharCode(encode(b & 0x3f) );
    };

    var encode = function(n) {
      if (n < 0) {
        // error.
      } else if (n < 26) {
        return 0x41 + n;
      } else if (n < 52) {
        return 0x61 + (n - 26);
      } else if (n < 62) {
        return 0x30 + (n - 52);
      } else if (n == 62) {
        return 0x2b;
      } else if (n == 63) {
        return 0x2f;
      }
      throw 'n:' + n;
    };

    _this.writeByte = function(n) {

      _buffer = (_buffer << 8) | (n & 0xff);
      _buflen += 8;
      _length += 1;

      while (_buflen >= 6) {
        writeEncoded(_buffer >>> (_buflen - 6) );
        _buflen -= 6;
      }
    };

    _this.flush = function() {

      if (_buflen > 0) {
        writeEncoded(_buffer << (6 - _buflen) );
        _buffer = 0;
        _buflen = 0;
      }

      if (_length % 3 != 0) {
        // padding
        var padlen = 3 - _length % 3;
        for (var i = 0; i < padlen; i += 1) {
          _base64 += '=';
        }
      }
    };

    _this.toString = function() {
      return _base64;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64DecodeInputStream
  //---------------------------------------------------------------------

  var base64DecodeInputStream = function(str) {

    var _str = str;
    var _pos = 0;
    var _buffer = 0;
    var _buflen = 0;

    var _this = {};

    _this.read = function() {

      while (_buflen < 8) {

        if (_pos >= _str.length) {
          if (_buflen == 0) {
            return -1;
          }
          throw 'unexpected end of file./' + _buflen;
        }

        var c = _str.charAt(_pos);
        _pos += 1;

        if (c == '=') {
          _buflen = 0;
          return -1;
        } else if (c.match(/^\s$/) ) {
          // ignore if whitespace.
          continue;
        }

        _buffer = (_buffer << 6) | decode(c.charCodeAt(0) );
        _buflen += 6;
      }

      var n = (_buffer >>> (_buflen - 8) ) & 0xff;
      _buflen -= 8;
      return n;
    };

    var decode = function(c) {
      if (0x41 <= c && c <= 0x5a) {
        return c - 0x41;
      } else if (0x61 <= c && c <= 0x7a) {
        return c - 0x61 + 26;
      } else if (0x30 <= c && c <= 0x39) {
        return c - 0x30 + 52;
      } else if (c == 0x2b) {
        return 62;
      } else if (c == 0x2f) {
        return 63;
      } else {
        throw 'c:' + c;
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // gifImage (B/W)
  //---------------------------------------------------------------------

  var gifImage = function(width, height) {

    var _width = width;
    var _height = height;
    var _data = new Array(width * height);

    var _this = {};

    _this.setPixel = function(x, y, pixel) {
      _data[y * _width + x] = pixel;
    };

    _this.write = function(out) {

      //---------------------------------
      // GIF Signature

      out.writeString('GIF87a');

      //---------------------------------
      // Screen Descriptor

      out.writeShort(_width);
      out.writeShort(_height);

      out.writeByte(0x80); // 2bit
      out.writeByte(0);
      out.writeByte(0);

      //---------------------------------
      // Global Color Map

      // black
      out.writeByte(0x00);
      out.writeByte(0x00);
      out.writeByte(0x00);

      // white
      out.writeByte(0xff);
      out.writeByte(0xff);
      out.writeByte(0xff);

      //---------------------------------
      // Image Descriptor

      out.writeString(',');
      out.writeShort(0);
      out.writeShort(0);
      out.writeShort(_width);
      out.writeShort(_height);
      out.writeByte(0);

      //---------------------------------
      // Local Color Map

      //---------------------------------
      // Raster Data

      var lzwMinCodeSize = 2;
      var raster = getLZWRaster(lzwMinCodeSize);

      out.writeByte(lzwMinCodeSize);

      var offset = 0;

      while (raster.length - offset > 255) {
        out.writeByte(255);
        out.writeBytes(raster, offset, 255);
        offset += 255;
      }

      out.writeByte(raster.length - offset);
      out.writeBytes(raster, offset, raster.length - offset);
      out.writeByte(0x00);

      //---------------------------------
      // GIF Terminator
      out.writeString(';');
    };

    var bitOutputStream = function(out) {

      var _out = out;
      var _bitLength = 0;
      var _bitBuffer = 0;

      var _this = {};

      _this.write = function(data, length) {

        if ( (data >>> length) != 0) {
          throw 'length over';
        }

        while (_bitLength + length >= 8) {
          _out.writeByte(0xff & ( (data << _bitLength) | _bitBuffer) );
          length -= (8 - _bitLength);
          data >>>= (8 - _bitLength);
          _bitBuffer = 0;
          _bitLength = 0;
        }

        _bitBuffer = (data << _bitLength) | _bitBuffer;
        _bitLength = _bitLength + length;
      };

      _this.flush = function() {
        if (_bitLength > 0) {
          _out.writeByte(_bitBuffer);
        }
      };

      return _this;
    };

    var getLZWRaster = function(lzwMinCodeSize) {

      var clearCode = 1 << lzwMinCodeSize;
      var endCode = (1 << lzwMinCodeSize) + 1;
      var bitLength = lzwMinCodeSize + 1;

      // Setup LZWTable
      var table = lzwTable();

      for (var i = 0; i < clearCode; i += 1) {
        table.add(String.fromCharCode(i) );
      }
      table.add(String.fromCharCode(clearCode) );
      table.add(String.fromCharCode(endCode) );

      var byteOut = byteArrayOutputStream();
      var bitOut = bitOutputStream(byteOut);

      // clear code
      bitOut.write(clearCode, bitLength);

      var dataIndex = 0;

      var s = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;

      while (dataIndex < _data.length) {

        var c = String.fromCharCode(_data[dataIndex]);
        dataIndex += 1;

        if (table.contains(s + c) ) {

          s = s + c;

        } else {

          bitOut.write(table.indexOf(s), bitLength);

          if (table.size() < 0xfff) {

            if (table.size() == (1 << bitLength) ) {
              bitLength += 1;
            }

            table.add(s + c);
          }

          s = c;
        }
      }

      bitOut.write(table.indexOf(s), bitLength);

      // end code
      bitOut.write(endCode, bitLength);

      bitOut.flush();

      return byteOut.toByteArray();
    };

    var lzwTable = function() {

      var _map = {};
      var _size = 0;

      var _this = {};

      _this.add = function(key) {
        if (_this.contains(key) ) {
          throw 'dup key:' + key;
        }
        _map[key] = _size;
        _size += 1;
      };

      _this.size = function() {
        return _size;
      };

      _this.indexOf = function(key) {
        return _map[key];
      };

      _this.contains = function(key) {
        return typeof _map[key] != 'undefined';
      };

      return _this;
    };

    return _this;
  };

  var createDataURL = function(width, height, getPixel) {
    var gif = gifImage(width, height);
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        gif.setPixel(x, y, getPixel(x, y) );
      }
    }

    var b = byteArrayOutputStream();
    gif.write(b);

    var base64 = base64EncodeOutputStream();
    var bytes = b.toByteArray();
    for (var i = 0; i < bytes.length; i += 1) {
      base64.writeByte(bytes[i]);
    }
    base64.flush();

    return 'data:image/gif;base64,' + base64;
  };

  //---------------------------------------------------------------------
  // returns qrcode function.

  return qrcode;
}();

// multibyte support
!function() {

  qrcode.stringToBytesFuncs['UTF-8'] = function(s) {
    // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
    function toUTF8Array(str) {
      var utf8 = [];
      for (var i=0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6),
              0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
          i++;
          // UTF-16 encodes 0x10000-0x10FFFF by
          // subtracting 0x10000 and splitting the
          // 20 bits of 0x0-0xFFFFF into two halves
          charcode = 0x10000 + (((charcode & 0x3ff)<<10)
            | (str.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charcode >>18),
              0x80 | ((charcode>>12) & 0x3f),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
      }
      return utf8;
    }
    return toUTF8Array(s);
  };

}();

(function (factory) {
  if (typeof define === 'function' && define.amd) {
      define([], factory);
  } else if (typeof exports === 'object') {
      module.exports = factory();
  }
}(function () {
    return qrcode;
}));

// ───────────────────────────────────────────────────────────────────────────
// Engine
// ───────────────────────────────────────────────────────────────────────────
const LABEL = { w: 55, h: 50 };                                 // mm — built-in default; every template carries its own w/h (v13.81)
const SIZE_MIN = 20, SIZE_MAX = 120;                            // mm — editor limits for the label size
const sizeOf = L => ({ w: Math.min(SIZE_MAX, Math.max(SIZE_MIN, num(L && L.w, LABEL.w))), h: Math.min(SIZE_MAX, Math.max(SIZE_MIN, num(L && L.h, LABEL.h))) });
const PX_PER_MM = 6;                                            // preview scale
const FIELD_DEFS = [
  { key: 'logo',    label: 'Seller logo',        kind: 'image' },
  { key: 'seller',  label: 'Seller name',        kind: 'text' },
  { key: 'sname',   label: 'Sticker name (product card)', kind: 'text' },
  { key: 'sqty',    label: 'Sticker qty (product card)',  kind: 'text' },
  { key: 'product', label: 'Product (order line name)',   kind: 'text' },
  { key: 'batch',   label: 'Batch no',           kind: 'text', prefix: 'Batch ' },
  { key: 'made',    label: 'Made (date · time)',   kind: 'text', prefix: 'Made ' },
  { key: 'packed',  label: 'Packed (date · time)', kind: 'text', prefix: 'Packed ' },
  { key: 'qr',      label: 'QR code',            kind: 'qr' },
  { key: 'note2',   label: 'Static text',        kind: 'text', text: 'Sterile Solution for\nSubcutaneous Injection\nRESEARCH PURPOSE ONLY' },
  { key: 'note',    label: 'Free text',          kind: 'text', text: 'Keep refrigerated 2–8 °C' },
];
function defaultLayout() {
  return {
    w: LABEL.w, h: LABEL.h,
    fields: {
      logo:    { on: true,  x: 2,  y: 2,  w: 14, h: 8 },
      seller:  { on: true,  x: 17, y: 2.5, w: 34, size: 9, bold: true,  align: 'right' },
      sname:   { on: true,  x: 2,  y: 12, w: 49, size: 12, bold: true,  align: 'left' },
      sqty:    { on: true,  x: 2,  y: 18, w: 49, size: 9,  bold: false, align: 'left' },
      product: { on: false, x: 2,  y: 12, w: 49, size: 10, bold: true,  align: 'left' },
      batch:   { on: true,  x: 2,  y: 24, w: 31, size: 8, bold: false, align: 'left', prefix: 'Batch ' },
      made:    { on: true,  x: 2,  y: 29, w: 31, size: 7, bold: false, align: 'left', prefix: 'Made ' },
      packed:  { on: true,  x: 2,  y: 33, w: 31, size: 7, bold: false, align: 'left', prefix: 'Packed ' },
      qr:      { on: true,  x: 35, y: 24, size: 16 },
      note2:   { on: true,  x: 2,  y: 37, w: 31, size: 6, bold: false, align: 'left', text: 'Sterile Solution for\nSubcutaneous Injection\nRESEARCH PURPOSE ONLY' },
      note:    { on: true,  x: 2,  y: 45.5, w: 49, size: 6, bold: false, align: 'left', text: 'Keep refrigerated 2–8 °C' },
    },
    bgOn: true,
  };
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, d) => { const n = parseFloat(v); return isFinite(n) ? n : d; };
function fmtDT(v) {   // Dubai time, dd.mm.yyyy hh:mm
  if (!v) return '';
  const d = new Date(v); if (isNaN(d)) return String(v);
  const u = new Date(d.getTime() + 4 * 3600 * 1000);
  const p = n => String(n).padStart(2, '0');
  return p(u.getUTCDate()) + '.' + p(u.getUTCMonth() + 1) + '.' + u.getUTCFullYear() + ' ' + p(u.getUTCHours()) + ':' + p(u.getUTCMinutes());
}
function qrSvg(text, mm) {
  try {
    const qr = qrcode(0, 'M'); qr.addData(String(text || ''), 'Byte'); qr.make();
    const n = qr.getModuleCount(); let rects = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) rects += `<rect x="${c}" y="${r}" width="1" height="1"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${mm}mm" height="${mm}mm" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
  } catch (e) { return `<div style="width:${mm}mm;height:${mm}mm;border:1px dashed #999;font-size:6pt;color:#999">QR?</div>`; }
}
// data = { seller, product, batch, made, packed, qr, logo (data URL) }
function labelHtml(layout, data, opts) {
  const L = layout || defaultLayout(); const f = L.fields || {}; const o = opts || {};
  const valueOf = (key, cfg) => {
    if (key === 'note' || key === 'note2') return cfg.text || '';
    const raw = key === 'made' || key === 'packed' ? fmtDT(data[key]) : (data[key] ?? '');
    return (cfg.prefix || '') + raw;
  };
  let inner = data.bg && L.bgOn !== false ? `<img class="stk-bg" src="${data.bg}" alt="">` : '';
  FIELD_DEFS.forEach(def => {
    const cfg = f[def.key]; if (!cfg || !cfg.on) return;
    const pos = `left:${num(cfg.x, 0)}mm;top:${num(cfg.y, 0)}mm;`;
    const sel = o.selected === def.key ? ' sel' : '';
    if (def.kind === 'image') {
      inner += `<div class="stk-f${sel}" data-key="${def.key}" style="${pos}width:${num(cfg.w, 14)}mm;height:${num(cfg.h, 8)}mm">${data.logo ? `<img src="${data.logo}" style="width:100%;height:100%;object-fit:contain;display:block">` : (o.editor ? '<div class="stk-ph">logo</div>' : '')}</div>`;
    } else if (def.kind === 'qr') {
      inner += `<div class="stk-f${sel}" data-key="${def.key}" style="${pos}width:${num(cfg.size, 16)}mm;height:${num(cfg.size, 16)}mm">${qrSvg(data.qr, num(cfg.size, 16))}</div>`;
    } else {
      inner += `<div class="stk-f stk-t${sel}" data-key="${def.key}" style="${pos}width:${num(cfg.w, 30)}mm;font-size:${num(cfg.size, 8)}pt;font-weight:${cfg.bold ? 700 : 400};text-align:${cfg.align || 'left'}">${esc(valueOf(def.key, cfg))}</div>`;
    }
  });
  const sz = sizeOf(L);
  return `<div class="stk" style="width:${sz.w}mm;height:${sz.h}mm">${inner}</div>`;
}
const LABEL_CSS = `.stk{position:relative;overflow:hidden;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}
.stk-bg{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:fill;display:block}
.stk-f{position:absolute;box-sizing:border-box;line-height:1.15;word-wrap:break-word}
.stk-t{white-space:pre-wrap}`;

function printLabels(layout, dataList) {
  const sz = sizeOf(layout);
  const labels = (dataList || []).map(d => labelHtml(layout, d)).join('');
  const w = window.open('', '_blank', 'width=420,height=520');
  if (!w) { if (typeof toast === 'function') toast('Pop-up blocked — allow pop-ups for this site to print', true); return null; }
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Labels</title><style>
    @page{size:${sz.w}mm ${sz.h}mm;margin:0}
    html,body{margin:0;padding:0;background:#fff}
    ${LABEL_CSS}
    .stk{page-break-after:always;break-after:page}
    .stk:last-child{page-break-after:auto;break-after:auto}
  </style></head><body>${labels}<script>window.onload=function(){setTimeout(function(){window.print();},150);};<\/script></body></html>`);
  w.document.close();
  return w;
}

// ───────────────────────────────────────────────────────────────────────────
// Template storage — public.label_templates (seller_key = seller id or 'default')
// ───────────────────────────────────────────────────────────────────────────
const _cache = {}; const CACHE_MS = 5 * 60 * 1000;   // a station keeps a template for 5 min, then re-reads (admin may have edited it)
async function loadTemplate(sellerId) {
  const key = sellerId ? String(sellerId) : 'default';
  if (_cache[key] && Date.now() - _cache[key]._at < CACHE_MS) return _cache[key];
  const { data, error } = await sb.from('label_templates').select('*').eq('seller_key', key);
  if (error) throw new Error(error.message || 'label_templates');
  const row = (data || [])[0];
  if (!row && key !== 'default') { const d = await loadTemplate(null); return { ...d, seller_key: key, inherited: true }; }
  const tpl = row ? { seller_key: key, seller_name: row.seller_name, layout: row.layout || defaultLayout(), logo: row.logo_data || null, bg: row.bg_data || null, updated_at: row.updated_at, updated_by: row.updated_by }
                  : { seller_key: key, layout: defaultLayout(), logo: null, bg: null, missing: true };
  tpl._at = Date.now(); _cache[key] = tpl; return tpl;
}
async function saveTemplate(sellerId, sellerName, layout, logo, bg) {
  const key = sellerId ? String(sellerId) : 'default';
  const row = { seller_key: key, seller_id: sellerId ? String(sellerId) : null, seller_name: sellerName || (sellerId ? null : 'Default'), layout, logo_data: logo || null, bg_data: bg || null,
                updated_by: (typeof currentUser !== 'undefined' && currentUser && currentUser.email) || null, updated_at: new Date().toISOString() };
  const { error } = await sb.from('label_templates').upsert(row, { onConflict: 'seller_key' });
  if (error) throw new Error(error.message || 'save failed');
  delete _cache[key];
  return true;
}
async function listTemplates() {   // sellers that have a template of their own (+ default) — for "Copy from…"
  const { data, error } = await sb.from('label_templates').select('seller_key,seller_name,updated_at');
  if (error) throw new Error(error.message || 'label_templates');
  return (data || []).map(r => ({ key: r.seller_key, name: r.seller_key === 'default' ? 'Default' : (r.seller_name || r.seller_key), updated_at: r.updated_at }))
    .sort((a, b) => (a.key === 'default' ? -1 : b.key === 'default' ? 1 : String(a.name).localeCompare(String(b.name))));
}
// Print `count` identical labels for a batch with the seller's template (no template → Default).
// data = { seller, product, sname, sqty, batch, made, packed, qr } — logo / bg come from the template.
async function printFor(sellerId, data, count) {
  const n = Math.max(1, Math.min(500, parseInt(count) || 1));
  const t = await loadTemplate(sellerId);
  const d = { ...data, seller: data.seller || t.seller_name || '', logo: t.logo || null, bg: t.bg || null };
  const w = printLabels(t.layout, Array.from({ length: n }, () => d));
  if (!w) throw new Error('Pop-up blocked — allow pop-ups for this site to print');
  const sz = sizeOf(t.layout);
  return { count: n, template: t.inherited || t.missing ? 'default' : t.seller_key, inherited: !!(t.inherited || t.missing), size: sz.w + 'x' + sz.h };
}
async function deleteTemplate(sellerId) {
  const key = sellerId ? String(sellerId) : 'default';
  const { error } = await sb.from('label_templates').delete().eq('seller_key', key);
  if (error) throw new Error(error.message || 'delete failed');
  delete _cache[key];
}

// ───────────────────────────────────────────────────────────────────────────
// Editor
// ───────────────────────────────────────────────────────────────────────────
const ED = { open: false, sellerId: null, sellerName: '', layout: null, logo: null, bg: null, selected: null, dirty: false, inherited: false, snap: '' };
const snapOf = () => JSON.stringify({ l: ED.layout, logo: ED.logo || null, bg: ED.bg || null });
function isDirty() { return !!ED.layout && snapOf() !== ED.snap; }   // real changes only — a click on the label or a move-and-back does not count
const LEAVE_MSG = () => 'Unsaved changes to the ' + (ED.sellerId ? '"' + ED.sellerName + '"' : 'Default') + ' label template will be lost. Continue?';
const SAMPLE = () => ({ seller: ED.sellerName || 'Seller name', product: 'RETAKLIK (RETA-GLP3) INJECTION 30mg/2.4ml', sname: 'RETAKLIK', sqty: '30 mg / 2.4 ml', batch: '261013-38',
  made: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), packed: new Date().toISOString(), qr: '261013-38', logo: ED.logo, bg: ED.bg });

const EDITOR_CSS = `
#stk-editor .stk-wrap{display:grid;grid-template-columns:300px 1fr 230px;gap:16px;align-items:start}
#stk-editor .stk-side{display:flex;flex-direction:column;gap:6px}
#stk-editor .stk-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px}
#stk-editor .stk-row.sel{border-color:var(--accent);background:rgba(245,166,35,.08)}
#stk-editor .stk-row input[type=checkbox]{width:15px;height:15px}
#stk-editor .stk-props{margin-top:8px;padding:10px;border:1px dashed var(--border);border-radius:8px;display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:center;font-size:11px;font-family:var(--mono);color:var(--muted)}
#stk-editor .stk-props input[type=number],#stk-editor .stk-props select,#stk-editor .stk-props input[type=text]{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:4px 6px;color:var(--text);font-family:var(--mono);font-size:12px;outline:none}
#stk-editor .stk-stage{display:flex;flex-direction:column;align-items:center;gap:8px}
#stk-editor .stk-board{position:relative;width:${LABEL.w * PX_PER_MM}px;height:${LABEL.h * PX_PER_MM}px;background:#fff;box-shadow:0 0 0 1px #999,0 6px 24px rgba(0,0,0,.35);
  background-image:linear-gradient(rgba(0,0,0,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.06) 1px,transparent 1px);background-size:${5 * PX_PER_MM}px ${5 * PX_PER_MM}px}
#stk-editor .stk-board .stk{transform:scale(${PX_PER_MM / (96 / 25.4)});transform-origin:0 0;background:transparent}
#stk-editor .stk-board .stk-f{cursor:move;outline:1px dashed rgba(0,0,0,.25)}
#stk-editor .stk-board .stk-f.sel{outline:2px solid #f5a623}
#stk-editor .stk-ph{width:100%;height:100%;border:1px dashed #bbb;color:#bbb;font-size:7pt;display:flex;align-items:center;justify-content:center}
#stk-editor .stk-hint{font-family:var(--mono);font-size:10px;color:var(--muted)}
#stk-editor .stk-actions{display:flex;flex-direction:column;gap:8px}
#stk-editor .stk-actions .btn{justify-content:center}
#stk-editor .stk-logo{border:1px dashed var(--border);border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:8px;align-items:center}
#stk-editor .stk-logo img{max-width:180px;max-height:70px;background:#fff;padding:4px;border-radius:4px}
@media (max-width: 1100px){#stk-editor .stk-wrap{grid-template-columns:1fr}}`;

function ensureEditorDom() {
  if (document.getElementById('stk-editor')) return;
  const st = document.createElement('style'); st.id = 'stk-editor-css'; st.textContent = LABEL_CSS + EDITOR_CSS; document.head.appendChild(st);
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'stk-editor'; ov.style.zIndex = '1300';
  ov.innerHTML = `<div class="modal" style="max-width:1120px;width:96vw">
    <div class="modal-header">
      <div><div class="modal-title">🏷 Label template</div><div id="stk-sub" style="font-size:12px;color:var(--muted);margin-top:2px"></div></div>
      <div style="display:flex;gap:8px;align-items:center">
        <select id="stk-seller" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 10px;color:var(--text);font-size:13px;outline:none"></select>
        <button class="close-btn" id="stk-close">&#10005;</button>
      </div>
    </div>
    <div class="modal-body">
      <div class="stk-wrap">
        <div>
          <div class="stk-side" id="stk-fields"></div>
          <div class="stk-props" id="stk-props"></div>
        </div>
        <div class="stk-stage">
          <div class="stk-board" id="stk-board"></div>
          <div class="stk-hint" id="stk-size-hint">drag fields · grid 5 mm · ${PX_PER_MM} px = 1 mm</div>
          <div class="stk-props" id="stk-size" style="margin-top:0;grid-template-columns:auto 1fr auto 1fr;width:100%;max-width:360px">
            <div style="grid-column:1/-1;color:var(--text);font-weight:700">Label size (mm)</div>
            <label>width</label><input type="number" id="stk-w" step="0.5" min="${SIZE_MIN}" max="${SIZE_MAX}">
            <label>height</label><input type="number" id="stk-h" step="0.5" min="${SIZE_MIN}" max="${SIZE_MAX}">
            <div class="stk-hint" style="grid-column:1/-1">Epson C4000e: set the same size in the printer dialog. Default 55 × 50.</div>
          </div>
        </div>
        <div class="stk-actions">
          <div class="stk-logo" id="stk-logo-box"></div>
          <div class="stk-logo" id="stk-bg-box"></div>
          <button class="btn btn-primary" id="stk-save">💾 Save template</button>
          <button class="btn btn-ghost" id="stk-print">🖨 Print test</button>
          <select class="btn btn-ghost" id="stk-copy-from" title="Replace this template (layout, logo, background) with another seller's one" style="width:100%;text-align:center;appearance:auto"><option value="">Copy from…</option></select>
          <button class="btn btn-ghost" id="stk-reset" title="Built-in starting layout">Reset layout</button>
          <button class="btn btn-ghost" id="stk-delete" style="color:var(--red)" title="Remove this seller's template — Default will be used">Delete template</button>
          <div class="stk-hint" id="stk-meta"></div>
        </div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(ov);
  document.getElementById('stk-close').onclick = closeEditor;
  document.getElementById('stk-save').onclick = saveFromEditor;
  document.getElementById('stk-print').onclick = () => printLabels(ED.layout, [SAMPLE()]);
  document.getElementById('stk-reset').onclick = () => { if (!confirm('Replace the layout with the built-in starting layout?')) return; ED.layout = defaultLayout(); ED.dirty = true; renderEditor(); };
  document.getElementById('stk-copy-from').onchange = async e => {
    const key = e.target.value; const name = e.target.options[e.target.selectedIndex].textContent; e.target.value = '';
    if (!key) return;
    if (!confirm('Replace the layout, logo and background of ' + (ED.sellerId ? ED.sellerName : 'Default') + ' with the template of ' + name + '? (not saved until you press Save)')) return;
    try {
      const d = await loadTemplate(key === 'default' ? null : key);
      ED.layout = JSON.parse(JSON.stringify(d.layout || defaultLayout())); ED.logo = d.logo || null; ED.bg = d.bg || null; ED.dirty = true;
      addMissingFields(ED.layout); renderEditor(); toast('Copied from ' + name + ' — not saved yet');
    } catch (err) { toast('Copy: ' + err.message, true); }
  };
  ['stk-w', 'stk-h'].forEach(id => { document.getElementById(id).onchange = e => {
    const v = Math.min(SIZE_MAX, Math.max(SIZE_MIN, num(e.target.value, LABEL.w))); e.target.value = v;
    ED.layout[id === 'stk-w' ? 'w' : 'h'] = v; ED.dirty = true; fitFields(ED.layout); renderEditor();
  }; });
  document.getElementById('stk-delete').onclick = async () => {
    if (!ED.sellerId) { toast('The Default template cannot be deleted', true); return; }
    if (!confirm('Delete the label template of ' + ED.sellerName + '? Labels will use the Default layout.')) return;
    try { await deleteTemplate(ED.sellerId); toast('Template deleted'); await openEditor(ED.sellerId, ED.sellerName); } catch (e) { toast('Delete: ' + e.message, true); }
  };
  document.getElementById('stk-seller').onchange = e => { const v = e.target.value; const name = e.target.options[e.target.selectedIndex].textContent; if (isDirty() && !confirm(LEAVE_MSG())) { e.target.value = ED.sellerId || ''; return; } openEditor(v || null, v ? name : 'Default'); };
  ov.addEventListener('click', e => { if (e.target === ov) closeEditor(); });
}
function sellerOptions(sel) {
  const list = (typeof clients !== 'undefined' ? clients : []).filter(c => c.is_seller).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return `<option value="" ${!sel ? 'selected' : ''}>Default (all sellers)</option>` + list.map(s => `<option value="${esc(s.id)}" ${String(s.id) === String(sel) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
}
function addMissingFields(layout) {   // fields added after the template was saved
  const dl = defaultLayout().fields; layout.fields = layout.fields || {};
  Object.keys(dl).forEach(k => { if (!layout.fields[k]) layout.fields[k] = JSON.parse(JSON.stringify(dl[k])); });
  const sz = sizeOf(layout); layout.w = sz.w; layout.h = sz.h;
}
function fitFields(layout) {   // after the label got smaller: keep every field inside
  const sz = sizeOf(layout);
  Object.entries(layout.fields || {}).forEach(([k, c]) => {
    const wmm = c.w != null ? num(c.w, 10) : num(c.size, 16), hmm = c.h != null ? num(c.h, 8) : (k === 'qr' ? num(c.size, 16) : 4);
    c.x = Math.max(0, Math.min(num(c.x, 0), sz.w - Math.min(wmm, sz.w))); c.y = Math.max(0, Math.min(num(c.y, 0), sz.h - Math.min(hmm, sz.h)));
  });
}
async function fillCopyFrom() {
  const sel = document.getElementById('stk-copy-from'); if (!sel) return;
  try {
    const list = (await listTemplates()).filter(t => t.key !== (ED.sellerId ? String(ED.sellerId) : 'default'));
    sel.innerHTML = '<option value="">Copy from…</option>' + list.map(t => `<option value="${esc(t.key)}">${esc(t.name)}</option>`).join('');
    sel.disabled = !list.length; if (!list.length) sel.innerHTML = '<option value="">Copy from… (none yet)</option>';
  } catch (e) { sel.innerHTML = '<option value="">Copy from…</option>'; }
}
async function openEditor(sellerId, sellerName) {
  ensureEditorDom();
  ED.sellerId = sellerId || null; ED.sellerName = sellerId ? (sellerName || '') : 'Default'; ED.selected = null; ED.dirty = false;
  document.getElementById('stk-seller').innerHTML = sellerOptions(ED.sellerId);
  document.getElementById('stk-editor').classList.add('open'); ED.open = true;
  document.getElementById('stk-sub').textContent = 'Loading…';
  try {
    const t = await loadTemplate(ED.sellerId);
    ED.layout = JSON.parse(JSON.stringify(t.layout || defaultLayout())); ED.logo = t.logo || null; ED.bg = t.bg || null; ED.inherited = !!t.inherited; ED.meta = t;
    addMissingFields(ED.layout);
    if (!ED.sellerName && t.seller_name) ED.sellerName = t.seller_name;
  } catch (e) { toast('Labels: ' + e.message, true); ED.layout = defaultLayout(); ED.logo = null; ED.bg = null; ED.meta = null; }
  ED.snap = snapOf();
  renderEditor(); fillCopyFrom();
}
function closeEditor() { if (isDirty() && !confirm(LEAVE_MSG())) return; document.getElementById('stk-editor').classList.remove('open'); ED.open = false; }
function renderEditor() {
  const f = ED.layout.fields;
  document.getElementById('stk-sub').textContent = (ED.sellerId ? ED.sellerName : 'Default — used by every seller without a template of their own') + (ED.inherited ? ' · no template yet: showing Default' : '');
  document.getElementById('stk-meta').textContent = ED.meta && ED.meta.updated_at ? 'saved ' + fmtDT(ED.meta.updated_at) + (ED.meta.updated_by ? ' by ' + ED.meta.updated_by : '') : (ED.inherited ? '' : 'not saved yet');
  document.getElementById('stk-fields').innerHTML = FIELD_DEFS.map(d => `<div class="stk-row${ED.selected === d.key ? ' sel' : ''}" data-key="${d.key}"><input type="checkbox" ${f[d.key] && f[d.key].on ? 'checked' : ''} data-toggle="${d.key}"><span>${esc(d.label)}</span></div>`).join('');
  document.querySelectorAll('#stk-fields .stk-row').forEach(row => {
    row.onclick = e => { if (e.target.tagName === 'INPUT') return; ED.selected = row.dataset.key; renderEditor(); };
    row.querySelector('input').onchange = e => { f[row.dataset.key].on = e.target.checked; ED.dirty = true; renderEditor(); };
  });
  const sz = sizeOf(ED.layout); const wi = document.getElementById('stk-w'), hi = document.getElementById('stk-h');
  if (wi) wi.value = sz.w; if (hi) hi.value = sz.h;
  const sh = document.getElementById('stk-size-hint'); if (sh) sh.textContent = sz.w + ' × ' + sz.h + ' mm · drag fields · grid 5 mm · ' + PX_PER_MM + ' px = 1 mm';
  renderProps(); renderBoard(); renderLogoBox(); renderBgBox();
}
function renderProps() {
  const el = document.getElementById('stk-props'); const k = ED.selected; const f = ED.layout.fields;
  if (!k || !f[k]) { el.innerHTML = '<div style="grid-column:1/-1">Click a field to edit its size and position, or drag it on the label.</div>'; return; }
  const def = FIELD_DEFS.find(d => d.key === k), c = f[k]; const sz = sizeOf(ED.layout);
  const numIn = (p, step, min, max) => `<input type="number" step="${step}" min="${min}" max="${max}" value="${c[p] ?? ''}" data-prop="${p}">`;
  let h = `<div style="grid-column:1/-1;color:var(--text);font-weight:700">${esc(def.label)}</div>
    <label>x mm</label>${numIn('x', 0.5, 0, sz.w)}<label>y mm</label>${numIn('y', 0.5, 0, sz.h)}`;
  if (def.kind === 'image') h += `<label>width mm</label>${numIn('w', 0.5, 2, sz.w)}<label>height mm</label>${numIn('h', 0.5, 2, sz.h)}`;
  else if (def.kind === 'qr') h += `<label>size mm</label>${numIn('size', 0.5, 8, 40)}`;
  else h += `<label>width mm</label>${numIn('w', 0.5, 5, sz.w)}<label>font pt</label>${numIn('size', 0.5, 4, 24)}
    <label>bold</label><input type="checkbox" ${c.bold ? 'checked' : ''} data-prop="bold" style="width:15px;height:15px;justify-self:start">
    <label>align</label><select data-prop="align"><option value="left" ${c.align === 'left' ? 'selected' : ''}>left</option><option value="center" ${c.align === 'center' ? 'selected' : ''}>center</option><option value="right" ${c.align === 'right' ? 'selected' : ''}>right</option></select>
    ${def.prefix !== undefined ? `<label>prefix</label><input type="text" value="${esc(c.prefix ?? def.prefix)}" data-prop="prefix">` : ''}
    ${k === 'note' || k === 'note2' ? `<label style="align-self:start">text</label><textarea data-prop="text" rows="3" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:4px 6px;color:var(--text);font-family:var(--mono);font-size:12px;outline:none;resize:vertical">${esc(c.text ?? '')}</textarea>` : ''}`;
  el.innerHTML = h;
  el.querySelectorAll('[data-prop]').forEach(inp => {
    inp.oninput = () => { const p = inp.dataset.prop; c[p] = inp.type === 'checkbox' ? inp.checked : (inp.type === 'number' ? num(inp.value, c[p]) : inp.value); ED.dirty = true; renderBoard(); };
  });
}
function selectField(key) {   // highlight without re-rendering the board
  ED.selected = key;
  document.querySelectorAll('#stk-fields .stk-row').forEach(r => r.classList.toggle('sel', r.dataset.key === key));
  document.querySelectorAll('#stk-board .stk-f').forEach(n => n.classList.toggle('sel', n.dataset.key === key));
  renderProps();
}
function renderBoard() {
  const board = document.getElementById('stk-board'); const sz = sizeOf(ED.layout);
  board.style.width = (sz.w * PX_PER_MM) + 'px'; board.style.height = (sz.h * PX_PER_MM) + 'px';
  board.innerHTML = labelHtml(ED.layout, SAMPLE(), { editor: true, selected: ED.selected });
  board.querySelectorAll('.stk-f').forEach(el => {
    el.onpointerdown = e => {
      const key = el.dataset.key, c = ED.layout.fields[key]; if (!c) return;
      e.preventDefault(); el.setPointerCapture(e.pointerId);
      const sx = e.clientX, sy = e.clientY, ox = num(c.x, 0), oy = num(c.y, 0);
      const wmm = c.w != null ? num(c.w, 10) : num(c.size, 16), hmm = c.h != null ? num(c.h, 8) : (c.size && key === 'qr' ? num(c.size, 16) : 4);
      if (ED.selected !== key) selectField(key);                                   // keep the board DOM — this node has the pointer capture
      const move = ev => {
        const nx = Math.round(Math.min(sz.w - wmm, Math.max(0, ox + (ev.clientX - sx) / PX_PER_MM)) * 2) / 2;
        const ny = Math.round(Math.min(sz.h - hmm, Math.max(0, oy + (ev.clientY - sy) / PX_PER_MM)) * 2) / 2;
        if (nx === c.x && ny === c.y) return;                                       // a plain click / sub-step jitter is not an edit
        c.x = nx; c.y = ny; ED.dirty = true;
        const node = board.querySelector(`.stk-f[data-key="${key}"]`); if (node) { node.style.left = c.x + 'mm'; node.style.top = c.y + 'mm'; }
        const px = document.querySelector('#stk-props [data-prop="x"]'), py = document.querySelector('#stk-props [data-prop="y"]'); if (px) px.value = c.x; if (py) py.value = c.y;
      };
      const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
      el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
    };
  });
}
function renderLogoBox() {
  const box = document.getElementById('stk-logo-box');
  box.innerHTML = `${ED.logo ? `<img src="${ED.logo}" alt="logo">` : '<div class="stk-hint">no logo</div>'}
    <label class="btn btn-ghost btn-sm" style="cursor:pointer">📁 ${ED.logo ? 'Replace logo' : 'Upload logo'}<input type="file" accept="image/png,image/jpeg,image/svg+xml" id="stk-logo-file" style="display:none"></label>
    ${ED.logo ? '<button class="btn btn-ghost btn-sm" id="stk-logo-remove">Remove logo</button>' : ''}
    <div class="stk-hint">PNG / JPG, stored with the template</div>`;
  document.getElementById('stk-logo-file').onchange = e => { const file = e.target.files[0]; if (file) loadLogoFile(file); };
  const rm = document.getElementById('stk-logo-remove'); if (rm) rm.onclick = () => { ED.logo = null; ED.dirty = true; renderEditor(); };
}
function renderBgBox() {
  const box = document.getElementById('stk-bg-box'); if (!box) return;
  const on = ED.layout.bgOn !== false; const sz = sizeOf(ED.layout);
  box.innerHTML = `<div class="stk-hint" style="color:var(--text);font-weight:700">Background</div>
    ${ED.bg ? `<img src="${ED.bg}" alt="background" style="max-height:60px">` : '<div class="stk-hint">no background — white label</div>'}
    <label class="btn btn-ghost btn-sm" style="cursor:pointer">📁 ${ED.bg ? 'Replace background' : 'Upload background'}<input type="file" accept="image/png,image/jpeg" id="stk-bg-file" style="display:none"></label>
    ${ED.bg ? `<label class="stk-hint" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="stk-bg-on" ${on ? 'checked' : ''} style="width:14px;height:14px"> show on the label</label><button class="btn btn-ghost btn-sm" id="stk-bg-remove">Remove background</button>` : ''}
    <div class="stk-hint">PNG / JPG, stretched to ${sz.w} × ${sz.h} mm (make it ${Math.round(sz.w / 25.4 * 300)} × ${Math.round(sz.h / 25.4 * 300)} px at 300 dpi, or the same ratio)</div>`;
  document.getElementById('stk-bg-file').onchange = e => { const file = e.target.files[0]; if (file) loadImageFile(file, 'bg'); };
  const rm = document.getElementById('stk-bg-remove'); if (rm) rm.onclick = () => { ED.bg = null; ED.dirty = true; renderEditor(); };
  const cb = document.getElementById('stk-bg-on'); if (cb) cb.onchange = () => { ED.layout.bgOn = cb.checked; ED.dirty = true; renderBoard(); };
}
function loadLogoFile(file) { loadImageFile(file, 'logo'); }
function loadImageFile(file, kind) {   // kind: 'logo' (≤ 600 px, keeps the logo field's aspect) | 'bg' (≤ 1200 px, full label)
  const limit = kind === 'bg' ? 4 : 2;
  if (file.size > limit * 1024 * 1024) { toast((kind === 'bg' ? 'Background' : 'Logo') + ' file is too big (max ' + limit + ' MB)', true); return; }
  const rd = new FileReader();
  rd.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = kind === 'bg' ? 1200 : 600; let w = img.width, h = img.height;
      if (w > max || h > max) { const k = Math.min(max / w, max / h); w = Math.round(w * k); h = Math.round(h * k); }
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h);
      if (kind === 'bg') { ED.bg = /jpe?g$/i.test(file.type) ? cv.toDataURL('image/jpeg', 0.92) : cv.toDataURL('image/png'); ED.layout.bgOn = true; }
      else {
        ED.logo = cv.toDataURL('image/png');
        const lg = ED.layout.fields.logo; if (lg && !lg._ratioSet) { lg.h = Math.round(Math.min(12, lg.w * h / w) * 2) / 2; lg._ratioSet = true; }   // keep the aspect on first upload
      }
      ED.dirty = true; renderEditor();
    };
    img.onerror = () => toast('Cannot read this image', true);
    img.src = rd.result;
  };
  rd.readAsDataURL(file);
}
async function saveFromEditor() {
  const btn = document.getElementById('stk-save'); btn.disabled = true;
  try {
    const layout = JSON.parse(JSON.stringify(ED.layout));
    Object.values(layout.fields).forEach(c => { delete c._ratioSet; });
    await saveTemplate(ED.sellerId, ED.sellerName, layout, ED.logo, ED.bg);
    ED.dirty = false; ED.inherited = false; ED.snap = snapOf();
    toast('🏷 Label template saved' + (ED.sellerId ? ' for ' + ED.sellerName : ' (Default)'));
    ED.meta = await loadTemplate(ED.sellerId); renderEditor(); fillCopyFrom();
  } catch (e) { toast('Save: ' + e.message, true); }
  finally { btn.disabled = false; }
}

window.Stickers = { version: STICKERS_VERSION, openEditor, closeEditor, labelHtml, printLabels, printFor, loadTemplate, listTemplates, saveTemplate, defaultLayout, sizeOf, FIELD_DEFS, LABEL, _ED: ED };
})();
