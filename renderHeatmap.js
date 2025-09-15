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

// Heatmap coloring (-2 to +2 scale)
var colorMap = [
  { value: -2.0, color: '#008080' },
  { value: -1.5, color: '#339999' },
  { value: -1.0, color: '#66b2b2' },
  { value: -0.5, color: '#99cccc' },
  { value:  0.0, color: '#ffffff' },
  { value:  0.5, color: '#d4b28c' },
  { value:  1.0, color: '#c48c5c' },
  { value:  1.5, color: '#a66a3f' },
  { value:  2.0, color: '#804000' }
];

// Data structure for Morpheus
var hmData = {};

// Reset the hmData structure and fill in the simple fields.
function initializeHmData(sampleList, markerList) {
	hmData = {};		// reset structure
	hmData['rows'] = markerList.length;
	hmData['columns'] = sampleList.length;
	hmData['seriesDataTypes'] = [ 'Float32' ];
	hmData['seriesNames'] = [ 'Differentially Expressed Gene Data for GSE103240' ];
}

// Populate the sample IDs into hmData
function fillInSampleIDs(sampleList) {
	hmData['sampleIDs'] = [];
	var sample;
	for (var s = 0; s < sampleList.length; s++) {
		sample = sampleList[s];
		hmData['sampleIDs'].push(sample['sampleID']);
	}
	log('Collected ' + hmData['sampleIDs'].length + ' sample IDs');
}

// Populate sample data into hmData
function fillInSamples(sampleList) {
	hmData['columnMetadataModel'] = {
		'vectors' : [
			{
				'name' : 'Sample',
				'array' : []
			},
			{
				'name' : 'Sample ID',
				'array' : []
			}
		]
	};

	var sample;
	for (var s = 0; s < sampleList.length; s++) {
		sample = sampleList[s];
		hmData['columnMetadataModel']['vectors'][0]['array'].push(sample['label']);
		hmData['columnMetadataModel']['vectors'][1]['array'].push(sample['sampleID']);
	}

	log('Collected ' + hmData['columnMetadataModel']['vectors'].length + ' sample vectors');
}

// Populate marker data into hmData
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

// Populate TPM values into hmData
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
	
	// Populate the cells with real data from cellTPM.
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
			sampleID = parseInt(sample['sampleID']);
			if ((markerID in cellTPM) && (sampleID in cellTPM[markerID])) {
				hmData['seriesArrays'][0][m][s] = parseFloat(cellTPM[markerID][sampleID]);
				cells++;
			}
		}
	}
	log('Filled data array with ' + cells + ' cells');
}

// Populate heatmap data structure and use Morpheus to render
function buildDataForMorpheus(sampleList, markerList, cellTPM) {
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
		columns: [{field:"Sample", display:["text"]}],
		colorScheme: {
	      	type: 'fractions',
	      	scalingMode: 'relative',
	      	stepped: false,
	      	missingColor: '#FFFFFF',
	      	map: colorMap
  		},
		tools:[{ 
			name: "Hierarchical Clustering", 
			params: {cluster: "Rows"} 
		}]
	  }); 

	// Hide dataset tab at the top of the heat map to prevent user from deleting the active heatmap and redirecting to morpheus upload page
	$('li.morpheus-sortable[role=presentation]').css('display', 'none');
}

(async () => {
	// Load data from csv file
	const { sampleList, markerList, cellTPM, cellTPMNorm } = await loadData();
  
	// Build heatmap
	buildDataForMorpheus(sampleList, markerList, cellTPM);
  })();
