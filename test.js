console.log("✅ test.js loaded");

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

// Test sample list
var sampleList = [
  {
    label: 'Tadpole Head',
    structure: 'Head',
    age: 'Stage 45',
    stage: 'Late',
    alleles: 'WT',
    strain: 'Nigerian',
    sex: 'Unknown',
    expID: 'EXP_XT001',
    bioreplicateCount: 2,
    bioreplicateSetID: 201
  },
  {
    label: 'Tailbud',
    structure: 'Tail',
    age: 'Stage 28',
    stage: 'Mid',
    alleles: 'WT',
    strain: 'Nigerian',
    sex: 'Unknown',
    expID: 'EXP_XT002',
    bioreplicateCount: 2,
    bioreplicateSetID: 202
  },
  {
    label: 'Whole Embryo',
    structure: 'Embryo',
    age: 'Stage 10',
    stage: 'Early',
    alleles: 'WT',
    strain: 'Nigerian',
    sex: 'Unknown',
    expID: 'EXP_XT003',
    bioreplicateCount: 2,
    bioreplicateSetID: 203
  }
];

// Test marker list
var markerList = [
  {
    symbol: 'sox2',
    markerID: 'XB-GENE-484553',
    ensemblGMID: 'ENSXETG00000036807'
  },
  {
    symbol: 'actb',
    markerID: 'XB-GENE-490883',
    ensemblGMID: 'ENSXETG00000025116'
  },
  {
    symbol: 'pax6',
    markerID: 'XB-GENE-484088',
    ensemblGMID: 'ENSXETG00000008175'
  }
];

// Test TPM values
cellTPM = {
  'XB-GENE-484553': { // sox2
    201: 0.1012,
    202: 0.0022,
    203: 0.0001
  },
  'XB-GENE-490883': { // actb
    201: 0.4001,
    202: 0.6000,
    203: 1.0
  },
  'XB-GENE-484088': { // pax6
    201: 0.6002,
    202: 0.0000998,
    203: 0.2025
  }
};

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
	hmData['seriesNames'] = [ 'Mouse RNA-Seq Heat Map of GXD search results' ];
}

// Populate the sample IDs into hmData.
function fillInSampleIDs(sampleList) {
	hmData['sampleIDs'] = [];
	var sample;
	for (var s = 0; s < sampleList.length; s++) {
		sample = sampleList[s];
		hmData['sampleIDs'].push(sample['bioreplicateSetID']);
	}
	log('Collected ' + hmData['sampleIDs'].length + ' sample IDs');
}

// Populate sample data into hmData.
function fillInSamples(sampleList) {
	hmData['columnMetadataModel'] = {
		'vectors' : [
			{
				'name' : 'label',
				'array' : []
			},
			{
				'name' : 'structure',
				'array' : []
			},
			{
				'name' : 'age',
				'array' : []
			},
			{
				'name' : 'stage',
				'array' : []
			},
			{
				'name' : 'alleles',
				'array' : []
			},
			{
				'name' : 'strain',
				'array' : []
			},
			{
				'name' : 'sex',
				'array' : []
			},
			{
				'name' : 'expID',
				'array' : []
			},
			{
				'name' : 'bioreplicateCount',
				'array' : []
			},
			{
				'name' : 'XB_BioReplicateSet_ID',
				'array' : []
			}
		]
	};

	var sample;
	for (var s = 0; s < sampleList.length; s++) {
		sample = sampleList[s];
		hmData['columnMetadataModel']['vectors'][0]['array'].push(sample['label']);
		hmData['columnMetadataModel']['vectors'][1]['array'].push(sample['structure']);
		hmData['columnMetadataModel']['vectors'][2]['array'].push(sample['age']);
		hmData['columnMetadataModel']['vectors'][3]['array'].push(String(sample['stage']));
		hmData['columnMetadataModel']['vectors'][4]['array'].push(sample['alleles']);
		hmData['columnMetadataModel']['vectors'][5]['array'].push(sample['strain']);
		hmData['columnMetadataModel']['vectors'][6]['array'].push(sample['sex']);
		hmData['columnMetadataModel']['vectors'][7]['array'].push(sample['expID']);
		hmData['columnMetadataModel']['vectors'][8]['array'].push(String(sample['bioreplicateCount']));
		hmData['columnMetadataModel']['vectors'][9]['array'].push(sample['bioreplicateSetID']);
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
			},
			{
				'name' : 'XB ID',
				'array' : []
			},
			{
				'name' : 'Ensembl ID',
				'array' : []
			}
		]
	};

	var marker;
	for (var m = 0; m < markerList.length; m++) {
		marker = markerList[m];
		hmData['rowMetadataModel']['vectors'][0]['array'].push(marker['symbol']);
		hmData['rowMetadataModel']['vectors'][1]['array'].push(marker['markerID']);
		hmData['rowMetadataModel']['vectors'][2]['array'].push(marker['ensemblGMID']);
	}

	log('Collected ' + hmData['rowMetadataModel']['vectors'].length + ' marker vectors');
}

// Actually build the structure of TPM values into hmData.
function fillInCells(sampleList, markerList) {
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
			sampleID = parseInt(sample['bioreplicateSetID']);
			if ((markerID in cellTPM) && (sampleID in cellTPM[markerID])) {
				hmData['seriesArrays'][0][m][s] = parseFloat(cellTPM[markerID][sampleID]);
				cells++;
			}
		}
	}
	log('Filled data array with ' + cells + ' cells');
}

// Slice and dice the data to produce the data for Morpheus.  Then hand off to Morpheus to render the heat map.
function buildDataForMorpheus(sampleList, markerList) {
	//updateLoadingMessage(spinner + ' Collating cells, genes, and samples...', false);
	initializeHmData(sampleList, markerList);
	fillInSampleIDs(sampleList);
	fillInSamples(sampleList);
	fillInMarkers(markerList);
	fillInCells(sampleList, markerList);
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

// Now call your builder
console.log("Calling buildDataForMorpheus...");
buildDataForMorpheus(sampleList, markerList);
console.log("✅ buildDataForMorpheus finished");
