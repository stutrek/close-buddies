var http = require('http');
var fs = require('fs');

var socketio = require('socket.io');
var geolib = require('geolib');

var server = http.createServer(function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
});
var io = socketio.listen(server);
server.listen(8081);

var clients = [];

function getNearbyClients( client, meters ) {
	meters = +meters || 30;
	return clients.filter(function(otherClient) {
		console.log('distance', client.location, otherClient.location );
		console.log( geolib.getDistance( client.location, otherClient.location ));

		return geolib.getDistance( client.location, otherClient.location ) < meters;
	});
}

var clientProto = {
	setLocation: function( newLocation ) {
		console.log("newLocation", newLocation);
		this.location = newLocation;
	}
};

function createClient( socket, location ) {
	location = location || {latitude: 0, longitude: 0};

	var client = Object.create( clientProto );
	client.socket = socket;
	client.location = location;

	return client;
}

io.sockets.on('connection', function( socket ) {
	var client = createClient( socket );
	clients.push(client);

	socket.on('location', function( data ) {
		client.setLocation(data);
	});

	socket.on('broadcast', function( data ) {
		var distance = data.distance || 10;
		var message = data.message;

		var nearbyClients = getNearbyClients( client, distance );

		nearbyClients.forEach(function( client ) {
			client.socket.emit('message', message);
		});
	});
	socket.on('disconnect', function() {
		var index = clients.indexOf(client);
		clients.splice(index, 1);
	});
});