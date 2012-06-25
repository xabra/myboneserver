
// Do the require's
//var bb = require('./bonescript');
var fs = require('fs');                 // File system
var express = require('express');       // express server
var socket = require('socket.io');      // Socket io
var events = require("events"); 

//--------------------------------------------------------------
// ---- Start up the servers and listen ----
var app = express.createServer();
var io = socket.listen(app);
app.listen(3001);
console.log('Express server started on port %s', app.address().port);

// --- Handle HTTP GET's
app.get('/', function (request, response) {
    response.sendfile(__dirname + '/myboneserver/index.html');
    });
   
app.get('/:file', function (request, response) {
   response.sendfile(__dirname + '/myboneserver/' + request.params.file);
   });   
   

// ----- Define the Controller class -----
function Controller() {
    this.state = 'Ready';   // Init current state
    this.nSamples = 50;    // Max number of samples to aquire
    this.iSample = 0;       // Sample counter
    this.ain1 = undefined;  // Value of analog input
}

Controller.prototype = events.EventEmitter.prototype;
Controller.prototype.constructor = Controller;
Controller.prototype.getCurrentState = function() {  
    return this.state;
};
Controller.prototype.setCurrentState = function(newState) {  
    this.state = newState;
};

Controller.prototype.updateState = function() {  
    this.emit ('state_changed', {currentState: this.getCurrentState(), adc0val: this.ain1, sample: this.iSample});
};

Controller.prototype.acquire = function acquire() { 
    var self = this;
    // Set D/A converters AOUT here
    // Read A/D converters AIN:
    self.ain1 = fs.readFileSync('/sys/devices/platform/tsc/ain1', 'utf8');  // Read in analog value
    self.updateState();
    if(self.iSample < self.nSamples-1) {
        self.iSample++; // Increment sample counter
        process.nextTick(self.acquire());             
    } else {    //...else reached end of measurement scan
        self.emit ('command', {name: 'stop'});                                
    }
};


Controller.prototype.handleCommand = function(data) {
    var self = this;
    switch(self.getCurrentState()) {
        case 'Ready':
            switch (data.name) {
                case 'run':
                    self.iSample = 0;   //Init sample count
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
    console.log(' -------  Controller.handleCommand(' + data.name + ') --> New State = '+ self.getCurrentState() );
};

//  ----- Create the Controller -----
var controller = new Controller("Controller");
console.log('Created new controller');

controller.on('command', function(data) {
    controller.handleCommand(data);
}); 

io.sockets.on('connection', function (socket) {
    // Receive UI commands from client and send to controller
    socket.on('command', function(data) {
        console.log(' ------  Received UI command: ' + data.name);
        controller.handleCommand(data);
    });
    
    // Send controller state changes to UI 
    controller.on('state_changed', function(data) {
        socket.emit('state_changed', data); 
    });
    
    controller.updateState();   //Refresh the UI on connection
});






