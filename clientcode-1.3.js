window.addEventListener("load", eventWindowLoaded, false);

function eventWindowLoaded () {
    spectrometerApp();   
}

function spectrometerApp () {
	//   var socket = io.connect('http://192.168.7.2:3001');
    var socket = io.connect('http://172.16.0.9:3001');
    var graphCanvas = document.getElementById("graph");
    var graph = new Graph(graphCanvas);
    initGraph(graph);
    
    //  Add   dataSeries...
	var series1 = new DataSeries("Spectrum 1");
	//series1.simulateData(0, 80, 200, 0.05, 0.95, 20, 0);
	series1.setLineWidth(0.8);
	series1.setLineColor("green");
	graph.addDataSeries(series1);		
	
    graph.draw();
	
    // --- Handle incoming state_changed events
    socket.on('state_changed', function(dataString) {
			  var dataCache = JSON.parse(dataString);
			  series1.data = dataCache.series.array;
			  graph.draw();
			  $('#fsm_state').text('Status: ' + dataCache.state);   // Update Status text
			  $('#adc0_value').text('ADC0 value = ' + dataCache.ain1);
			  $('#sample').text('Sample = ' + dataCache.iSample);
			  switch (dataCache.state) {    // Enable or disable buttons
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
}

function initGraph (g) {
	g.setCanvasColor("#eeeeff").setCanvasBorderColor("black").setCanvasBorderLineWidth(0.2);
	g.setWorldColor("#ffffff").setWorldBorderColor("black").setWorldBorderLineWidth(0.2);
	
	// Set up the graph title and axes titles
	var darkGray = "#444444";
	g.getGraphTitle().setText("Mass Spectrum").setColor(darkGray).setSize(18).setFace("sans-serif");
	g.getXAxisTitle().setText("Mass (AMU)").setColor(darkGray).setSize(14).setFace("sans-serif");
	g.getYAxisTitle().setText("Current (microAmps)").setColor(darkGray).setSize(14).setFace("sans-serif");
	g.setGraphTitleOffset(10).setXAxisTitleOffset(5).setYAxisTitleOffset(5);
	
	// Set up the world to screen mapping
	g.setWorldMargins(50, 120, 50, 50);
	g.setWorldRectangle(0, 80, 0.95, 1.0);
	
	g.setXAxisLogScale(false).setYAxisLogScale(false);	// Log scale?
	g.setXLabelsOffset(5).setYLabelsOffset(5);		// Axes labels offsets
	g.setXMajorTic(5).setXMinorTicCount(5).setYMajorTic(0.01).setYMinorTicCount(5);		// Tic/grid spacing
	g.getXLabels().setColor(darkGray).setSize(12).setFace("sans-serif");
	g.getYLabels().setColor(darkGray).setSize(12).setFace("sans-serif");
	g.setXLabelsPrecision(2).setYLabelsPrecision(2);
	g.setXMajorGridLineWidth(0.5).setXMajorGridColor("#0000ff").setXMinorGridLineWidth(0.2).setXMinorGridColor("#0000ff");
	g.setYMajorGridLineWidth(0.5).setYMajorGridColor("#0000ff").setYMinorGridLineWidth(0.2).setYMinorGridColor("#0000ff");
	
	// Legend setup
	g.legend.setBox(g.screenRect.right+10, g.screenRect.right+10+100, g.screenRect.top+30, g.screenRect.top+30);
	
}



