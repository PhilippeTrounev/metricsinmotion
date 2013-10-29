// Generated by LiveScript 1.2.0
(function(){
  var join$ = [].join;
  this.include = function(){
    var DB, SC, KEY, BASEPATH, EXPIRE, HMAC_CACHE, hmac, ref$, Text, Html, Csv, Json, RealBin, sendFile, newRoom, IO, api, ExportCSV, ExportHTML, requestToCommand, requestToSave;
    this.use('json', this.app.router, this.express['static'](__dirname));
    this.app.use('/edit', this.express['static'](__dirname));
    this.app.use('/view', this.express['static'](__dirname));
    this.include('dotcloud');
    this.include('player-broadcast');
    this.include('player-graph');
    this.include('player');
    DB = this.include('db');
    SC = this.include('sc');
    KEY = this.KEY;
    BASEPATH = this.BASEPATH;
    EXPIRE = this.EXPIRE;
    HMAC_CACHE = {};
    hmac = !KEY
      ? function(it){
        return it;
      }
      : function(it){
        var encoder;
        return HMAC_CACHE[it] || (HMAC_CACHE[it] = (encoder = require('crypto').createHmac('sha256', KEY), encoder.update(it.toString()), encoder.digest('hex')));
      };
    ref$ = ['text/plain', 'text/html', 'text/csv', 'application/json'].map((function(it){
      return it + "; charset=utf-8";
    })), Text = ref$[0], Html = ref$[1], Csv = ref$[2], Json = ref$[3];
    RealBin = require('path').dirname(require('fs').realpathSync(__filename));
    sendFile = function(file){
      return function(){
        this.response.type(Html);
        return this.response.sendfile(RealBin + "/" + file);
      };
    };
    if (this.CORS) {
      console.log("Cross-Origin Resource Sharing (CORS) enabled.");
      this.all('*', function(req, res, next){
        this.response.header('Access-Control-Allow-Origin', '*');
        this.response.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,If-Modified-Since');
        this.response.header('Access-Control-Allow-Methods', 'GET,POST,PUT');
        if ((req != null ? req.method : void 8) === 'OPTIONS') {
          return res.send(204);
        }
        return next();
      });
    }
    newRoom = function(){
      return require('uuid-pure').newId(10, 36).toLowerCase();
    };
    this.get({
      '/': sendFile('index.html')
    });
    this.get({
      '/favicon.ico': function(){
        return this.response.send(404, '');
      }
    });
    this.get({
      '/_new': function(){
        var room;
        room = newRoom();
        return this.response.redirect(KEY
          ? BASEPATH + "/" + room + "/edit"
          : BASEPATH + "/" + room);
      }
    });
    this.get({
      '/_start': sendFile('start.html')
    });
    IO = this.io;
    api = function(cb){
      return function(){
        var this$ = this;
        return SC._get(this.params.room, IO, function(arg$){
          var snapshot, ref$, type, content;
          snapshot = arg$.snapshot;
          if (snapshot) {
            ref$ = cb.call(this$.params, snapshot), type = ref$[0], content = ref$[1];
            if (type === Csv) {
              this$.response.set('Content-Disposition', "attachment; filename=\"" + this$.params.room + ".csv\"");
            }
            if (content instanceof Function) {
              return content(SC[this$.params.room], function(rv){
                this$.response.type(type);
                return this$.response.send(200, rv);
              });
            } else {
              this$.response.type(type);
              return this$.response.send(200, content);
            }
          } else {
            this$.response.type(Text);
            return this$.response.send(404, '');
          }
        });
      };
    };
    ExportCSV = api(function(){
      return [
        Csv, function(sc, cb){
          return sc.exportCSV(cb);
        }
      ];
    });
    ExportHTML = api(function(){
      return [
        Html, function(sc, cb){
          return sc.exportHTML(cb);
        }
      ];
    });
    this.get({
      '/:room.csv': ExportCSV
    });
    this.get({
      '/:room.html': ExportHTML
    });
    this.get({
      '/:room': KEY
        ? function(){
          var ref$;
          switch (false) {
          case !((ref$ = this.query.auth) != null && ref$.length):
            return sendFile('index.html').call(this);
          default:
            return this.response.redirect(BASEPATH + "/" + this.params.room + "?auth=0");
          }
        }
        : sendFile('index.html')
    });
    this.get({
      '/:room/edit': function(){
        var room;
        room = this.params.room;
        return this.response.redirect(BASEPATH + "/" + room + "?auth=" + hmac(room));
      }
    });
    this.get({
      '/:room/view': function(){
        var room;
        room = this.params.room;
        return this.response.redirect(BASEPATH + "/" + room + "?auth=0");
      }
    });
    this.get({
      '/_/:room/cells/:cell': api(function(){
        var this$ = this;
        return [
          Json, function(sc, cb){
            return sc.exportCell(this$.cell, cb);
          }
        ];
      })
    });
    this.get({
      '/_/:room/cells': api(function(){
        return [
          Json, function(sc, cb){
            return sc.exportCells(cb);
          }
        ];
      })
    });
    this.get({
      '/_/:room/html': ExportHTML
    });
    this.get({
      '/_/:room/csv': ExportCSV
    });
    this.get({
      '/_/:room': api(function(it){
        return [Text, it];
      })
    });
    requestToCommand = function(request, cb){
      var command, ref$, buf, this$ = this;
      if (request.is('application/json')) {
        command = (ref$ = request.body) != null ? ref$.command : void 8;
        if (command) {
          return cb(command);
        }
      }
      buf = '';
      request.setEncoding('utf8');
      request.on('data', function(chunk){
        return buf += chunk;
      });
      return request.on('end', function(){
        if (!request.is('text/csv')) {
          cb(buf);
        }
        return SC.csvToSave(buf, function(save){
          if (~save.indexOf("\\")) {
            save = save.replace(/\\/g, "\\b");
          }
          if (~save.indexOf(":")) {
            save = save.replace(/:/g, "\\c");
          }
          if (~save.indexOf("\n")) {
            save = save.replace(/\n/g, "\\n");
          }
          return cb("loadclipboard " + save);
        });
      });
    };
    requestToSave = function(request, cb){
      var snapshot, ref$, buf, this$ = this;
      if (request.is('application/json')) {
        snapshot = (ref$ = request.body) != null ? ref$.snapshot : void 8;
        if (snapshot) {
          return cb(snapshot);
        }
      }
      buf = '';
      request.setEncoding('utf8');
      request.on('data', function(chunk){
        return buf += chunk;
      });
      return request.on('end', function(){
        if (!request.is('text/csv')) {
          cb(buf);
        }
        return SC.csvToSave(buf, function(save){
          return cb("socialcalc:version:1.0\nMIME-Version: 1.0\nContent-Type: multipart/mixed; boundary=SocialCalcSpreadsheetControlSave\n--SocialCalcSpreadsheetControlSave\nContent-type: text/plain; charset=UTF-8\n\n# SocialCalc Spreadsheet Control Save\nversion:1.0\npart:sheet\npart:edit\npart:audit\n--SocialCalcSpreadsheetControlSave\nContent-type: text/plain; charset=UTF-8\n\n" + save + "\n--SocialCalcSpreadsheetControlSave\nContent-type: text/plain; charset=UTF-8\n\n--SocialCalcSpreadsheetControlSave\nContent-type: text/plain; charset=UTF-8\n\n--SocialCalcSpreadsheetControlSave--\n");
        });
      });
    };
    this.put({
      '/_/:room': function(){
        var this$ = this;
        return requestToSave(this.request, function(snapshot){
          return SC._put(this$.params.room, snapshot, function(){
            this$.response.type(Text);
            return this$.response.send(201, 'OK');
          });
        });
      }
    });
    this.post({
      '/_/:room': function(){
        var room, this$ = this;
        room = this.params.room;
        return requestToCommand(this.request, function(command){
          if (!command) {
            this$.response.type(Text);
            return this$.response.send(400, 'Please send command');
          }
          return SC._get(room, IO, function(arg$){
            var snapshot, row, ref$;
            snapshot = arg$.snapshot;
            if (/^loadclipboard\s*/.exec(command)) {
              row = 1;
              if (/\nsheet:c:\d+:r:(\d+):/.exec(snapshot)) {
                row += Number(RegExp.$1);
              }
              command = [command, "paste A" + row + " all"];
            }
            if (!Array.isArray(command)) {
              command = [command];
            }
            if ((ref$ = SC[room]) != null) {
              ref$.ExecuteCommand(join$.call(command, '\n'));
            }
            IO.sockets['in']("log-" + room).emit('data', {
              type: 'execute',
              cmdstr: join$.call(command, '\n'),
              room: room
            });
            return this$.response.json(202, {
              command: command
            });
          });
        });
      }
    });
    this.post({
      '/_': function(){
        var this$ = this;
        return requestToSave(this.request, function(snapshot){
          var room, ref$;
          room = ((ref$ = this$.body) != null ? ref$.room : void 8) || newRoom();
          return SC._put(room, snapshot, function(){
            this$.response.type(Text);
            this$.response.location("/_/" + room);
            return this$.response.send(201, "/" + room);
          });
        });
      }
    });
    this.on({
      disconnect: function(){
        var id, key, room, i$, ref$, len$, client;
        id = this.socket.id;
        CleanRoom: for (key in IO.sockets.manager.roomClients[id]) {
          if (/^\/log-/.exec(key)) {
            room = key.substr(5);
            for (i$ = 0, len$ = (ref$ = IO.sockets.clients(key.substr(1))).length; i$ < len$; ++i$) {
              client = ref$[i$];
              if (client.id !== id) {
                continue CleanRoom;
              }
            }
            if ((ref$ = SC[room]) != null) {
              ref$.terminate();
            }
            delete SC[room];
          }
        }
      }
    });
    return this.on({
      data: function(){
        var ref$, room, msg, user, ecell, cmdstr, type, auth, reply, broadcast, this$ = this;
        ref$ = this.data, room = ref$.room, msg = ref$.msg, user = ref$.user, ecell = ref$.ecell, cmdstr = ref$.cmdstr, type = ref$.type, auth = ref$.auth;
        room = (room + "").replace(/^_+/, '');
        if (EXPIRE) {
          DB.expire("snapshot-" + room, EXPIRE);
        }
        reply = function(data){
          return this$.emit({
            data: data
          });
        };
        broadcast = function(data){
          return this$.socket.broadcast.to(this$.data.to
            ? "user-" + this$.data.to
            : "log-" + room).emit('data', data);
        };
        switch (type) {
        case 'chat':
          DB.rpush("chat-" + room, msg, function(){
            return broadcast(this$.data);
          });
          break;
        case 'ask.ecells':
          DB.hgetall("ecell-" + room, function(_, values){
            return broadcast({
              type: 'ecells',
              ecells: values,
              room: room
            });
          });
          break;
        case 'my.ecell':
          DB.hset("ecell-" + room, user, ecell);
          break;
        case 'execute':
          if (auth === '0' || KEY && hmac(room) !== auth) {
            return;
          }
          DB.multi().rpush("log-" + room, cmdstr).rpush("audit-" + room, cmdstr).bgsave().exec(function(){
            var ref$;
            if ((ref$ = SC[room]) != null) {
              ref$.ExecuteCommand(cmdstr);
            }
            return broadcast(this$.data);
          });
          break;
        case 'ask.log':
          this.socket.join("log-" + room);
          this.socket.join("user-" + user);
          DB.multi().get("snapshot-" + room).lrange("log-" + room, 0, -1).lrange("chat-" + room, 0, -1).exec(function(_, arg$){
            var snapshot, log, chat;
            snapshot = arg$[0], log = arg$[1], chat = arg$[2];
            SC[room] = SC._init(snapshot, log, DB, room, this$.io);
            return reply({
              type: 'log',
              room: room,
              log: log,
              chat: chat,
              snapshot: snapshot
            });
          });
          break;
        case 'ask.recalc':
          this.socket.join("recalc." + room);
          SC._get(room, this.io, function(arg$){
            var log, snapshot;
            log = arg$.log, snapshot = arg$.snapshot;
            return reply({
              type: 'recalc',
              room: room,
              log: log,
              snapshot: snapshot
            });
          });
          break;
        case 'stopHuddle':
          if (this.KEY && KEY !== this.KEY) {
            return;
          }
          DB.del(['audit', 'log', 'chat', 'ecell', 'snapshot'].map(function(it){
            return it + "-" + room;
          }), function(){
            var ref$;
            if ((ref$ = SC[room]) != null) {
              ref$.terminate();
            }
            delete SC[room];
            return broadcast(this$.data);
          });
          break;
        case 'ecell':
          if (auth === '0' || KEY && auth !== hmac(room)) {
            return;
          }
          broadcast(this.data);
          break;
        default:
          broadcast(this.data);
        }
      }
    });
  };
}).call(this);