function convert() {
    const db = new sqlite3.Database('mydatabase.sqlite');
  
    // Map input column names to output column names and aggregation functions
    const outputColumns = {
      "기사님 UUID": { name: "Drive UUID", aggregation: "key" },
      "설명": { name: "Trip completed", aggregation: "marker" },
      "수익 : 순수익 : 요금": { name: "Total meter fare", aggregation: "sum", marker: "trip completed" },
      "수익 : 순수익 : 요금": { name: "Adjusted Fare", aggregation: "sum", marker: "trip fare adjust order" },
      "수익:지급:정산:현금 결제": { name: "Total cash paid", aggregation: "sum", marker: "trip completed" },
      "수익:순수익:서비스이용료 (부가가치세 포함)": { name: "Service Fee", aggregation: "sum", marker: "trip completed" },
      "수익:순수익:프로모션:퀘스트": { name: "promotion", aggregation: "sum" },
      "수익:지급:환불:통행료": { name: "toll fee", aggregation: "sum", marker: "trip completed" }
    };
  
    // Group rows by key and marker
    const groups = {};
    const inputColumns = Object.keys(outputColumns);
    const query = `SELECT ${inputColumns.join(", ")} FROM mytable;`;
  
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error(err.message);
        return;
      }
  
      rows.forEach(row => {
        const key = row[outputColumns["기사님 UUID"].name];
        const marker = row[outputColumns["설명"].name];
  
        if (!groups[key]) {
          groups[key] = {};
        }
  
        if (!groups[key][marker]) {
          groups[key][marker] = {};
        }
  
        inputColumns.forEach(inputColumn => {
          const { name, aggregation, marker: aggregationMarker } = outputColumns[inputColumn];
          const value = row[inputColumn];
  
          if (aggregation === "key") {
            groups[key][marker][name] = value;
          } else if (aggregation === "marker" && marker === aggregationMarker) {
            groups[key][marker][name] = value;
          } else if (aggregation === "sum" && marker === aggregationMarker) {
            groups[key][marker][name] = (groups[key][marker][name] || 0) + Number(value);
          }
        });
      });
  
      console.log(groups);
  
    // Generate the output rows
    const outputRows = [];
    Object.keys(groups).forEach(key => {
      let tripCount = 0;
      Object.keys(groups[key]).forEach(marker => {
        if (marker === 'trip completed order') {
          tripCount += 1;
        }
        const outputRow = {
          'Drive UUID': key,
          'Trip completed': marker,
          'Total meter fare': 0,
          'Adjusted Fare': 0,
          'Total cash paid': 0,
          'Service Fee': 0,
          'promotion': 0,
          'toll fee': 0
        };
        Object.keys(outputRow).forEach(outputColumn => {
          const validColumn = Object.keys(outputColumns).find(inputColumn =>
            outputColumns[inputColumn].name === outputColumn
          );
          if (validColumn) {
            const { aggregation, marker: aggregationMarker } = outputColumns[validColumn];
            const value = groups[key][marker][validColumn];
            if (aggregation === 'sum' && marker === aggregationMarker) {
              outputRow[outputColumn] = Number(value) || 0;
            } else if (aggregation === 'key') {
              outputRow[outputColumn] = value || '';
            }
          }
        });
        outputRows.push(outputRow);
      });
      if (tripCount === 0) {
        const outputRow = {
          'Drive UUID': key,
          'Trip completed': '',
          'Total meter fare': 0,
          'Adjusted Fare': 0,
          'Total cash paid': 0,
          'Service Fee': 0,
          'promotion': 0,
          'toll fee': 0
        };
        outputRows.push(outputRow);
      }
      });
      console.log(outputRows);
    });
    // Write the output CSV file
    const outputFile = dialog.showSaveDialogSync({
      title: "Save Output CSV",
      buttonLabel: "Save",
      properties: ["createDirectory", "showOverwriteConfirmation"],
      filters: [{ name: "CSV Files", extensions: ["csv"] }]
    });

    if (!outputFile) {
      console.log("No output file selected");
      return;
    }

    const fileStream = fs.createWriteStream(outputFile);

    const csvStringifier = csv.stringify({
      header: true,
      columns: Object.keys(outputColumns).map(key => ({ key, header: outputColumns[key].name }))
    });
    csvStringifier.on("error", err => {
      console.error(err);
    });

    fileStream.on("error", err => {
      console.error(err);
    });

    fileStream.on("finish", () => {
      console.log(`Output CSV file written to ${outputFile}`);
    });

    csvStringifier.pipe(fileStream);
    outputRows.forEach(row => {
      csvStringifier.write(row);
    });
    csvStringifier.end();
}