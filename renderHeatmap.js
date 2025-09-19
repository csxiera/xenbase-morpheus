function createLogger(enabled = true) {
    let logging = enabled;
    let lastTime = new Date().getTime();

    return {
        log: function(msg) {
            if (!logging) return;
            try {
                const now = new Date().getTime();
                const elapsed = now - lastTime;
                console.log(elapsed + 'ms : ' + msg);
                lastTime = now;
            } catch (err) {
                // ignore
            }
        },
        enable: function() { logging = true; },
        disable: function() { logging = false; },
        resetTimer: function() { lastTime = new Date().getTime(); }
    };
}

function loadData(rows) {
    const sampleSet = new Map();
    const markerSet = new Map();
    const cellTPM = {};

    const controlLabel = "Control";
    const controlSampleID = 200;
    sampleSet.set(controlLabel, controlSampleID);

    rows.forEach((row) => {
        const sampleLabel = row["binName"];      // sample label
        const markerSymbol = row["geneSymbol"];  // gene symbol
        const markerID = row["modelId"];         // marker ID
        const tpm = parseFloat(row["tpmAvgVal"]);
        const controlTpm = parseFloat(row["ctrlTpmAvgVal"]);

        // Deduplicate samples
        if (!sampleSet.has(sampleLabel)) {
            sampleSet.set(sampleLabel, 200 + sampleSet.size);
        }
        const sampleID = sampleSet.get(sampleLabel);

        // Deduplicate markers
        if (!markerSet.has(markerID)) {
            markerSet.set(markerID, markerSymbol);
        }

        // Populate cellTPM
        if (!cellTPM[markerID]) cellTPM[markerID] = {};
        cellTPM[markerID][sampleID] = tpm;
        cellTPM[markerID][controlSampleID] = controlTpm;
    });

    // Sort genes by LogFC for first non-control sample (sampleID 201)
    const logFC = rows
        .filter(row => sampleSet.get(row["binName"]) === 201)
        .map(row => ({
            markerID: row["modelId"],
            logFC: parseFloat(row["logFC"])
        }))
        .sort((a, b) => b.logFC - a.logFC);

    // Convert maps → arrays
    const sampleList = [...sampleSet.entries()].map(([label, id]) => ({
        label,
        sampleID: id
    }));

    const markerList = logFC.map(({ markerID, logFC }) => ({
        markerID,
        symbol: markerSet.get(markerID),
        logFC
    }));

    return { sampleList, markerList, cellTPM };
}

// Reset the hmData structure and fill in the simple fields.
function initializeHmData(hmData, sampleList, markerList) {
	hmData['rows'] = markerList.length;
	hmData['columns'] = sampleList.length;
	hmData['seriesDataTypes'] = [ 'Float32' ];
	hmData['seriesNames'] = [ 'Differentially Expressed Gene Data' ];
}

// Populate the sample IDs into hmData
function fillInSampleIDs(logger, hmData, sampleList) {
	hmData['sampleIDs'] = [];
	var sample;
	for (var s = 0; s < sampleList.length; s++) {
		sample = sampleList[s];
		hmData['sampleIDs'].push(sample['sampleID']);
	}
	logger.log('Collected ' + hmData['sampleIDs'].length + ' sample IDs');
}

// Populate sample data into hmData
function fillInSamples(logger, hmData, sampleList) {
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

	logger.log('Collected ' + hmData['columnMetadataModel']['vectors'].length + ' sample vectors');
}

// Populate marker data into hmData
function fillInMarkers(logger, hmData, markerList) {
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

	logger.log('Collected ' + hmData['rowMetadataModel']['vectors'].length + ' marker vectors');
}

// Populate TPM values into hmData
function fillInCells(logger, hmData, sampleList, markerList, cellTPM) {
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
	
	logger.log('Created data array (' + hmData['rows'] + ' x ' + hmData['columns'] + ')');
	
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
	logger.log('Filled data array with ' + cells + ' cells');
}


// Populate heatmap data structure and use Morpheus to render
function buildDataForMorpheus(logger, hmData, sampleList, markerList, cellTPM, colorMap) {
	initializeHmData(hmData, sampleList, markerList);
	fillInSampleIDs(logger, hmData, sampleList);
	fillInSamples(logger, hmData, sampleList);
	fillInMarkers(logger, hmData, markerList);
	fillInCells(logger, hmData, sampleList, markerList, cellTPM);
	logger.log('Finished building data for Morpheus');

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

function renderHeatmap(data) {
	const logger = createLogger(true);
	
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
	
    const { sampleList, markerList, cellTPM } = loadData(data);	//load data from json string
    buildDataForMorpheus(logger, hmData, sampleList, markerList, cellTPM, colorMap);
}

const testData = [
    {
        binName: "Sample 1",
        geneSymbol: "GeneA",
        modelId: "M1",
        logFC: "2.5",
        tpmAvgVal: "10",
        ctrlTpmAvgVal: "5",
        fDr: "0.01"
    },
	{
        binName: "Sample 1",
        geneSymbol: "GeneB",
        modelId: "M1",
        logFC: "2.5",
        tpmAvgVal: "10",
        ctrlTpmAvgVal: "5",
        fDr: "0.01"
    },
    {
        binName: "Sample 2",
        geneSymbol: "GeneA",
        modelId: "M2",
        logFC: "1.5",
        tpmAvgVal: "20",
        ctrlTpmAvgVal: "10",
        fDr: "0.05"
    },
	{
        binName: "Sample 2",
        geneSymbol: "GeneB",
        modelId: "M2",
        logFC: "1.5",
        tpmAvgVal: "20",
        ctrlTpmAvgVal: "10",
        fDr: "0.05"
    }
];

renderHeatmap(testData);