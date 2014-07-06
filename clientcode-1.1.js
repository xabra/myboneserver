var socket = io.connect('http://192.168.7.2:3001');

// --- Handle incoming state_changed events
socket.on('state_changed', function(data) {
		  $('#fsm_state').text('Status: ' + data.currentState);   // Update Status text
		  $('#adc0_value').text('ADC0 value = ' + data.adc0val);
		  $('#sample').text('Sample = ' + data.sample);
		  switch (data.currentState) {    // Enable or disable buttons
		  case "Ready":
		  $("#button_run").removeAttr("disabled");
		  $("#button_pause").attr("disabled", "disabled");
		  $("#button_stop").attr("disabled", "disabled");
		  break;
		  
		  case "Scanning":
		  $("#button_run").attr("disabled", "disabled");
		  $("#button_pause").removeAttr("disabled");
		  $("#button_stop").removeAttr("disabled");
		  break;
		  
		  case "Paused":
		  $("#button_run").removeAttr("disabled");
		  $("#button_pause").attr("disabled", "disabled");
		  $("#button_stop").removeAttr("disabled");
		  break;
		  
		  default:
		  //Throw error?
		  break;      
		  }
		  });

// --- Handle (outgoing) button_click events.  Send to server
$(document).ready(function() {
				  $('#button_run').click(function(){
										 socket.emit('command', {name: 'run'});
										 });
				  
				  $('#button_stop').click(function(){
										  socket.emit('command', {name: 'stop'});
										  });
				  
				  $('#button_pause').click(function(){
										   socket.emit('command', {name: 'pause'});
										   });
				  });

