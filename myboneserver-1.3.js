
// Do the require's
// var bb = require('./bonescript');    // Mappings to BeagleBone I/O etc...
var fs = require('fs');                 // File system
var express = require('express');       // express server
var socket = require('socket.io');      // Socket io
var events = require("events"); 

//--------------------------------------------------------------
// ---- Start up the servers and listen ----
var app = express.createServer();
var io = socket.listen(app);
io.set('log level', 1);
app.listen(3001);
console.log(' ----- Express server started on port %s', app.address().port);

// --- Handle HTTP GET's
app.get('/', function (request, response) {
		response.sendfile(__dirname + '/index.html');
		});

app.get('/:file', function (request, response) {
		response.sendfile(__dirname + '/' + request.params.file);
		});   

// ----- Define Point class ----
function Point(x, y) {
    this.x = x;
	this.y = y;
}

// ----- Define Series class ----
function Series () {
    this.name = '';
    this.array = [];
}

// ----- Define DataCache class ----
function DataCache () {
    this.state = '';   // Init current state
    this.nSamples = 10;    // Max number of samples to aquire
    this.iSample = 0;       // Sample counter
    this.ain1 = undefined;  // Value of analog input 
    this.series = new Series();
}

// ----- Define Controller class -----
function Controller() {
    this.dataCache = new DataCache();   // Stores all the parameters to be shared with the UI
    this.dataCache.state = 'Ready';
    this.dataCache.nSamples = 800;
    this.dataCache.iSample = 0;
}

Controller.prototype = events.EventEmitter.prototype;
Controller.prototype.constructor = Controller;
Controller.prototype.getCurrentState = function() { return this.dataCache.state; };
Controller.prototype.setCurrentState = function(newState) { this.dataCache.state = newState; };

Controller.prototype.updateState = function() {  //Broadcast any changes to internal state
    var dataString = JSON.stringify(this.dataCache); // Pack the data up into a string
    this.emit ('state_changed', dataString);     // Send it off to socket
};

Controller.prototype.acquire = function acquire() { 
    var self = this;
    var x, y, i, n, p;
    
    if (self.getCurrentState() == 'Scanning') {
        i = self.dataCache.iSample;
        n = self.dataCache.nSamples;
        // Set D/A converters AOUT here
        x = i/n * 80;
        // Read A/D converters AIN:
        self.dataCache.ain1 = y = fs.readFileSync('/sys/devices/platform/tsc/ain1', 'utf8')/4095;  // Read in analog value
        p = new Point(x,y);
        self.dataCache.series.array[i] = p;
        if (i % 10 === 0) {self.updateState();}
        if(i < n-1) {
            self.dataCache.iSample++; // Increment sample counter
            process.nextTick(function ()  {self.acquire();});         
        } else {    //...else, we have reached end of measurement scan -> issue stop command
            self.emit ('command', {name: 'stop'});                                
        }
    }
};


Controller.prototype.handleCommand = function(data) {
    var self = this;
    switch(self.getCurrentState()) {
        case 'Ready':
            switch (data.name) {
                case 'run':
                    self.dataCache.iSample = 0;   //Init sample count
                    self.setCurrentState('Scanning');
                    self.acquire();     // start data acquisition loop  
    				break;
                default:
					break;
            }
			break;
        case 'Paused':
            switch (data.name) {
                case 'run':
                    self.setCurrentState('Scanning');
                    self.acquire();     // start data acquisition loop
					break;
                case 'stop':
                    self.setCurrentState('Ready');           
					break;
                default:
					break;
            }
			break;
        case 'Scanning':
            switch (data.name) {
                case 'stop':
                    self.dataCache.iSample = 0;
                    self.setCurrentState('Ready');
					break;
                case 'pause':
                    self.setCurrentState('Paused');
					break;
                default:
					break;
            }
			break;        
    }
    self.updateState();
    console.log(' ----- Controller.handleCommand(' + data.name + ') --> New State = '+ self.getCurrentState() );
};

//  ----- Create the Controller -----
var controller = new Controller("Controller");
console.log(' ----- Created new controller');


controller.on('command', function(data) {
			  controller.handleCommand(data);
			  }); 


io.sockets.on('connection', function (socket) {
			  console.log(' ----- Client Connected ');
			  
			  // Receive UI commands from client and send to controller
			  socket.on('command', function(data) {
						console.log(' ----- Received UI command: ' + data.name);
						controller.handleCommand(data);
						});
			  
			  // Send controller state changes to UI 
			  controller.on('state_changed', function(data) {
							socket.emit('state_changed', data); 
							});
			  
			  // on disconnect
			  socket.on('disconnect', function() {
						console.log(" ----- Client disconnected.");
						});
			  
			  controller.updateState();   //Refresh the UI on connection
			  });


