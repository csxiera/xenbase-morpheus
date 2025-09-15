import { loadData } from "./dataLoader.js";

var logging = true;		// is logging to the console enabled? (true/false)
var lastTime = new Date().getTime();	// time in ms when last message was logged
var startTime = new Date().getTime();	// time in ms when script loaded

// log a message to the browser console, if logging is enabled
function log(msg) {
    if (logging) {
	    try {
	    	var elapsed = new Date().getTime() - lastTime;
    		console.log(elapsed + 'ms : ' + msg);
	    	lastTime = new Date().getTime();
    	} catch (c) {}
   	}
}

// Definitions for cell coloring based on average quantile-normalized TPM value.
// Note that colorMap should not contain definitions less than zero.  (Below zero numbers make
// all the cells show up as white.)
var colorMap = [
  { value: 0,
    color: '#E0E0E0'
  },
  { value: 0.0000998,
    color: '#E0E0E0'
  },
  { value: 0.0001000,
    color: '#cdddc9'
  },
  { value: 0.0011500,
    color: '#a4bfa1'
  },
  { value: 0.0022000,
    color: '#6c7d6a'
  },
  { value: 0.1012000,
    color: '#4f5f4e'
  },
  { value: 0.2002000,
    color: '#3b4a3a'
  },
  { value: 0.4001000,
    color: '#2a3528'
  },
  { value: 0.6000000,
    color: '#1a2319'
  },
  { value: 1,
    color: '#000000'
  }
];

// Show the legend popup.
function showPopup() {
	$('#tipsPopup').dialog( {
		title : 'Heat Map Legend',
		width : '400px',
		position : { my: 'right center', at: 'right center', within: window }
	} );
}

// cellTPM[marker ID][sample key] = average quantile-normalized TPM value
//var cellTPM = {};

// number of cells to request in a single batch (sized to have progress meter updates every 11-12 seconds)
var chunkSize = 150000;

// number of data cells already retrieved
var countDone = 0;

// number of data cells to retrieve
var totalCount = 0;

// list of chunks of cells to retrieve, each a sublist as [ start index (inclusive), end index (exclusive) ]
var chunks = [];

// number of chunks where we've sent a request and are currently waiting for results
var chunksInProgress = 0;

// max number of chunks to request simultaneously
var maxRequests = 3;

// Have we failed yet?  If so, we should ignore pending data requests and not overwrite error messages.
var failed = false;

// map of sample keys
var sampleKeys = {};

// data structure for Morpheus (complex)
var hmData = {};

// Reset the hmData structure (for Morpheus) and fill in the simple fields.
function initializeHmData(sampleList, markerList) {
	hmData = {};		// reset structure
	hmData['rows'] = markerList.length;
	hmData['columns'] = sampleList.length;
	hmData['seriesDataTypes'] = [ 'Float32' ];
	hmData['seriesNames'] = [ 'Differentially Expressed Gene Data for GSE103240' ];
}

// Populate the sample IDs into hmData.
function fillInSampleIDs(sampleList) {
	hmData['sampleIDs'] = [];
	var sample;
	for (var s = 0; s < sampleList.length; s++) {
		sample = sampleList[s];
		hmData['sampleIDs'].push(sample['replicateID']);
	}
	log('Collected ' + hmData['sampleIDs'].length + ' sample IDs');
}

// Populate sample data into hmData.
function fillInSamples(sampleList) {
	hmData['columnMetadataModel'] = {
		'vectors' : [
			{
				'name' : 'Experiment Name',
				'array' : []
			},
			{
				'name' : 'Replicate ID',
				'array' : []
			}
		]
	};

	var sample;
	for (var s = 0; s < sampleList.length; s++) {
		sample = sampleList[s];
		hmData['columnMetadataModel']['vectors'][0]['array'].push(sample['label']);
		hmData['columnMetadataModel']['vectors'][1]['array'].push(sample['replicateID']);
	}

	log('Collected ' + hmData['columnMetadataModel']['vectors'].length + ' sample vectors');
}

// Populate marker data into hmData.
function fillInMarkers(markerList) {
	hmData['rowMetadataModel'] = {
		'vectors' : [
			{
				'name' : 'Gene Symbol',
				'array' : []
			}
		]
	};

	var marker;
	for (var m = 0; m < markerList.length; m++) {
		marker = markerList[m];
		hmData['rowMetadataModel']['vectors'][0]['array'].push(marker['symbol']);
	}

	log('Collected ' + hmData['rowMetadataModel']['vectors'].length + ' marker vectors');
}

// Actually build the structure of TPM values into hmData.
function fillInCells(sampleList, markerList, cellTPM) {
	var notStudied = null;		// flag for cells that have not been studied

	// Data are in a list of rows, with each row being a list of column values.
	// Initially all will be notStudied.
	
	hmData['seriesArrays'] = [[]];					// only 1 series, but allow for multiples
	for (var r = 0; r < hmData['rows']; r++) {
		hmData['seriesArrays'][0].push([]);				// add new empty row
		for (var c = 0; c < hmData['columns']; c++) {
			hmData['seriesArrays'][0][r].push(notStudied);	// add another column to that row
		}
	}
	
	log('Created data array (' + hmData['rows'] + ' x ' + hmData['columns'] + ')');
	
	// Now populate the cells with real data from cellTPM.
	
	var marker;
	var markerID;
	var sample;
	var sampleID;
	var cells = 0;
	for (var m = 0; m < markerList.length; m++) {
		marker = markerList[m];
		markerID = marker['markerID'];
		for (var s = 0; s < sampleList.length; s++) {
			sample = sampleList[s];
			sampleID = parseInt(sample['replicateID']);
			if ((markerID in cellTPM) && (sampleID in cellTPM[markerID])) {
				hmData['seriesArrays'][0][m][s] = parseFloat(cellTPM[markerID][sampleID]);
				cells++;
			}
		}
	}
	log('Filled data array with ' + cells + ' cells');
}

// Slice and dice the data to produce the data for Morpheus.  Then hand off to Morpheus to render the heat map.
function buildDataForMorpheus(sampleList, markerList, cellTPM) {
	//updateLoadingMessage(spinner + ' Collating cells, genes, and samples...', false);
	initializeHmData(sampleList, markerList);
	fillInSampleIDs(sampleList);
	fillInSamples(sampleList);
	fillInMarkers(markerList);
	fillInCells(sampleList, markerList, cellTPM);
	log('Finished building data for Morpheus');

	$('#heatmapWrapper').empty();
	
	new morpheus.HeatMap({
	    el: $('#heatmapWrapper'),
	    dataset: hmData,
	    colorScheme: {
	      type: 'fractions',
	      scalingMode: 1,
	      stepped: false,
	      min: 0,
	      max: 5000,
	      missingColor: '#FFFFFF',
	      map: colorMap
  		  }
	  }); 

	// Hide the tab title at the top of the heat map, as it has odd characters that I can't get
	// to disappear (and it's not overly useful anyway, for our purposes).
	$('li.morpheus-sortable[role=presentation]').css('display', 'none');
  
	// Show the Tips popup after a brief delay, so we give the browser's scrollbars time to get
	// into place.
	setTimeout(function() { showPopup() }, 500);
	var elapsed = new Date().getTime() - startTime;
	log('Heatmap displayed (' + elapsed + ' ms)');
}

(async () => {
	const { sampleList, markerList, cellTPM } = await loadData();
  
	// Debugging checks
	console.log("Samples loaded:", sampleList.length, sampleList);
	console.log("Markers loaded:", markerList.length, markerList);
	console.log("cellTPM keys:", Object.keys(cellTPM).slice(0, 10));
  
	buildDataForMorpheus(sampleList, markerList, cellTPM);
  })();
