const csv = require('csv')
const fs = require('fs')
const sqlite = require('better-sqlite3');
const XLSX = require('xlsx');
const path = require('path');
const { ipcRenderer } = require('electron');

// Shared Variables
let selectedFileName;
let promotionColumns = [];

// Create or open the database
let db;
const dbPath = path.resolve(__dirname, 'mydatabase.sqlite');
db = sqlite(dbPath);

const totalRowCount = 1000000; // This is just a placeholder value

const validColumns = [
  "거래 UUID",                                         // Transaction UUID   | 거래 UUID
  "기사님 UUID",                                        // Driver UUID        | 기사님 UUID
  "이름",                                              // First Name         | 이름
  "성",                                               // Last Name          | 성
  "운행 종료 일시",                                      // Time Completed     | 운행 종료 일시
  "수익",                                              // Total Payout       | 총 수익
  "수익:순수익:요금:운행 요금 (앱 결제, 현장 결제)",            // Meter Fare         | 미터 요금
  "수익:순수익:서비스이용료 (부가가치세 포함)",                 // Service Fee        | 수수료
  "수익:지급:환불:통행료",                                 // Toll Fee           | 통행료
  "수익:지급:정산:현금 결제",                              // Cash Collected     | 직접 결제
  "수익:순수익:요금:호출료",                               // Booking Fee        | 호출료
  "수익:순수익:요금:취소 수수료"                            // Cancellation Fee   | 취소 수수료
];
const columnTypes = {
  "거래 UUID": 'TEXT',                                             // Transaction UUID   | 거래 UUID
  "기사님 UUID": 'TEXT',                                           // Driver UUID        | 기사님 UUID
  "이름": 'TEXT',                                                 // First Name         | 이름
  "성": 'TEXT',                                                   // Last Name          | 성
  "운행 종료 일시": 'DATETIME',                                      // Time Completed     | 운행 종료 일시
  "수익": 'INTEGER',                                              // Total Payout       | 총 수익
  "수익:순수익:요금:운행 요금 (앱 결제, 현장 결제)": 'INTEGER',            // Meter Fare         | 미터 요금
  "수익:순수익:서비스이용료 (부가가치세 포함)": 'INTEGER',                 // Service Fee        | 수수료
  "수익:지급:환불:통행료": 'INTEGER',                                 // Toll Fee           | 통행료
  "수익:지급:정산:현금 결제": 'INTEGER',                              // Cash Collected     | 직접 결제
  "수익:순수익:요금:호출료": 'INTEGER',                               // Booking Fee        | 호출료
  "수익:순수익:요금:취소 수수료": 'INTEGER'                            // Cancellation Fee   | 취소 수수료
};

// Close the database connection when the window is closed
window.addEventListener('beforeunload', (event) => {
  closeDatabaseConnection();
});

function checkStartButtonEnabled() {
  const startButton = document.getElementById('startButton');
  const startButtonMessage = document.getElementById('startButtonMessage');
  
  if (selectedFileName !== null) {
    startButton.disabled = false;
    startButton.classList.remove('d-none');
    startButtonMessage.classList.add('d-none');
  } else {
    startButton.disabled = true;
    startButton.classList.add('d-none');
    startButtonMessage.classList.remove('d-none');
  }
  console.log(selectedFileName);
}

function selectFile() {
  const input = document.getElementById('file');
  if ('files' in input && input.files.length > 0) {
    const file = input.files[0];
    if (file.type === 'text/csv') {
      // Set the selected file name
      selectedFileName = file.name;
    } else {
      selectedFileName = null;
    }
  } else {
    selectedFileName = null;
  }
  
  checkStartButtonEnabled();
}

function start() {
  // Create or open the database
  db = sqlite(dbPath);
  // Drop the table if it already exists and create it with the specified columns
  const input = document.getElementById('file');
  const file = input.files[0];
  const reader = new FileReader();
  reader.readAsText(file);

  // Disable the start button and hide file select
  const startButton = document.getElementById('startButton');
  startButton.disabled = true;
  startButton.classList.add('d-none');
  input.classList.add('d-none');

  const progressBarPart1 = document.getElementById('progress-bar-part1');
  progressBarPart1.style.width = '10%';
  progressBarPart1.setAttribute('aria-valuenow', 10);
  progressBarPart1.parentElement.classList.remove('d-none');

  // Count the number of rows in the CSV file
  let totalRowCount = 0;
  let firstRow = true;
  reader.onload = (event) => {
    const parseCsvResult = event.target.result;
    const parser = csv.parse({ columns: true });
    parser.on('readable', () => {
      while (row = parser.read()) {
        // Process first row separately to extract headers
        if (firstRow) {
          promotionColumns = Object.keys(row).filter(header => header.startsWith('수익:순수익:프로모션:'));
          validColumns.push(...promotionColumns);
          promotionColumns.forEach(column => columnTypes[column] = 'INTEGER');
          firstRow = false;
        }
        totalRowCount++;
      }
    });
    parser.on('end', () => {
      console.log('Total row count:', totalRowCount);
      console.log('Valid columns:', validColumns);
      console.log('Column types:', columnTypes);
      // Now validColumns and columnTypes also include promotionColumns, can be used in subsequent function like parseCsv()
      db.exec(`DROP TABLE IF EXISTS mytable`);
      
      const createTableSQL = `CREATE TABLE mytable (${validColumns.map(columnName => `\`${columnName}\` ${columnTypes[columnName]}`).join(', ')})`;
      db.exec(createTableSQL);
      // Table has been created, now we can parse the CSV data
      parseCsv(parseCsvResult, totalRowCount, db);
    });
    parser.write(parseCsvResult);
    parser.end();
  };
}

function parseCsv(parseCsvResult, totalRowCount) {
  const parser = csv.parse({ columns: true });
  const progressBar = document.getElementById('progress-bar-part1');
  let rowCount = 0;
  db.exec('DROP TABLE IF EXISTS myOutput');

  parser.on('readable', () => {
    let row;

    const processNextRow = () => {
      row = parser.read();

      if (row) {
        // Only keep the specified columns and ignore the rest
        const values = validColumns.map(name => row[name]);

        try {
          db.prepare(`INSERT INTO mytable VALUES (${Array(validColumns.length).fill('?').join(',')})`).run(values);
          // Increment the row count and update the progress bar
          rowCount++;
          let progress;
          if (rowCount <= 50) {
            // Scale progress from 10% to 70%
            progress = (rowCount / 50) * 60 + 10;
          } else {
            // Scale progress from 70% to 80%
            progress = 70 + ((rowCount - 50) / (totalRowCount - 50)) * 10;
          }
          progressBar.style.width = `${progress}%`;
          progressBar.setAttribute('aria-valuenow', progress);
          processNextRow();
        } catch (err) {
          console.error(err);
        }
      } else {
        // All rows have been processed
        parser.end(() => {
          console.log('All data has been parsed.');
        });
      }

    };

    // Start processing the first row
    processNextRow();
  });

  parser.on('error', err => {
    console.error(err);
    reset();
  });

  parser.on('end', () => {
    console.log('All data has been inserted into the database.');
    //Next step
    deletePayoutUUIDs();
  });

  // Signal that parsing is complete
  parser.write(parseCsvResult);
  parser.end(() => {
    console.log('All data has been parsed.');
  });
}


function deletePayoutUUIDs() {
  const query = `DELETE FROM mytable WHERE "기사님 UUID" = '00000000-0000-0000-0000-000000000000'`;

  try {
    const info = db.prepare(query).run();
    console.log(`Rows deleted: ${info.changes}`);
  } catch (err) {
      console.error(err.message);
  }
  //Next step
  convert();
}

function convert() {
  const progressBar = document.getElementById('progress-bar-part1');

  // Drop the myOutput table if it exists
  try {
  db.exec(`
      DROP TABLE IF EXISTS myOutput;
  `);
  } catch (err) {
    console.error(err.message);
  }

  // Create the myOutput table
  try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS myOutput (
      "거래 UUID" TEXT PRIMARY KEY,
      "기사님 UUID" TEXT,
      "이름" TEXT,
      "운행 종료 일시" DATETIME,
      "총 수익" INTEGER DEFAULT 0,
      "미터 요금" INTEGER DEFAULT 0,
      "수수료" INTEGER DEFAULT 0,
      "통행료" INTEGER DEFAULT 0,
      "직접 결제" INTEGER DEFAULT 0,
      "호출료" INTEGER DEFAULT 0,
      "취소 수수료" INTEGER DEFAULT 0,
      "프로모션" INTEGER DEFAULT 0,
      "요금 조정 금액" INTEGER DEFAULT 0
    )
  `);
  } catch (err) {
    console.error(err.message);
  }
  const count = db.prepare(`
  SELECT COUNT(*) as total
  FROM mytable
  `).get();
  console.log(count.total);

  try {
    db.exec(`
    INSERT INTO myOutput (
      "거래 UUID",
      "기사님 UUID",
      "운행 종료 일시",
      "총 수익",
      "미터 요금",
      "수수료",
      "통행료",
      "직접 결제",
      "호출료",
      "취소 수수료"
    ) 
    SELECT 
      "거래 UUID",
      "기사님 UUID",
      "운행 종료 일시",
      IFNULL("수익", 0),
      IFNULL("수익:순수익:요금:운행 요금 (앱 결제, 현장 결제)", 0),
      IFNULL("수익:순수익:서비스이용료 (부가가치세 포함)", 0),
      IFNULL("수익:지급:환불:통행료", 0),
      IFNULL("수익:지급:정산:현금 결제", 0),
      IFNULL("수익:순수익:요금:호출료", 0),
      IFNULL("수익:순수익:요금:취소 수수료", 0)
    FROM mytable
    `);
  } catch (err) {
    console.error(err.message);
  }
  console.log('Data has been moved from mytable to myOutput.');
  progressBar.style.width = '90%';

  try {
    // Start a transaction
    db.exec('BEGIN');
  
    // Update the 이름 column in myOutput based on the matching 거래 UUID in mytable
    db.exec(`
      UPDATE myOutput 
      SET 이름 = (
        SELECT (mytable.성 || mytable.이름) 
        FROM mytable 
        WHERE mytable."거래 UUID" = myOutput."거래 UUID"
      )
    `);
  
    // Commit the transaction
    db.exec('COMMIT');
  } catch (err) {
    console.error('Error in combining columns: ', err);
    // If any error occurred, rollback the transaction
    db.exec('ROLLBACK');
  }
  console.log('Name Columns have been combined.');

  // Sum All promotion columns
  const sumOfPromotionColumns = promotionColumns.map(column => `"${column}"`).join(' + ');
  const sqlQuery = `
    UPDATE myOutput
    SET "프로모션" = (SELECT ${sumOfPromotionColumns} FROM mytable WHERE mytable."거래 UUID" = myOutput."거래 UUID")
  `;
  
  try {
    db.exec(sqlQuery);
  }
  catch (err) {
    console.error(err.message);
  }
  progressBar.style.width = '92%';

  // Create Miscellaneous Adjustments Column
  try {
    db.exec(`
      UPDATE myOutput 
      SET "요금 조정 금액" = "총 수익" -
      (
        "미터 요금" +
        "수수료" +
        "통행료" +
        "직접 결제" +
        "호출료" +
        "취소 수수료" +
        "프로모션"
      )
    `);
  } catch (err) {
    console.error(err.message);
  }
  console.log('Miscellaneous Adjustments Column has been created.');
  progressBar.style.width = '94%';

  //Trim 기사님 UUID to last 5 characters
  try {
    const sqlQuery = `
      UPDATE myOutput
      SET "기사님 UUID" = SUBSTR("기사님 UUID", -5)
    `;
    db.exec(sqlQuery);
  } catch (err) {
    console.error(err.message);
  }
  console.log('기사님 UUID has been trimmed to last 5 characters.');
  progressBar.style.width = '96%';  

  // Print out the contents of the myOutput table for debugging
  const count2 = db.prepare(`
  SELECT COUNT(*) as total
  FROM myOutput
  `).get();
  console.log(count2.total);

  // Set progress bar to 100%
  progressBar.style.width = '100%';
  progressBar.setAttribute('aria-valuenow', 100);

  // Wait for half a second
  setTimeout(() => {
    // Enable download and reset buttons
    const download = document.getElementById('download');
    download.disabled = false;
    download.classList.remove('d-none');

    const reset = document.getElementById('reset');
    reset.disabled = false;
    reset.classList.remove('d-none');

    // Hide progress bar
    progressBar.parentElement.classList.add('d-none');
  }, 1000);
}

function download() {
  const rows = db.prepare(`
      SELECT *
      FROM myOutput
  `).all();

  const headers = Object.keys(rows[0]);
  const data = rows.map(row => Object.values(row));

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  const buffer = XLSX.write(workbook, { type: 'buffer' });
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  
  // Create the new file name
  // Replace the extension in selectedFileName with "output"
  const baseFileName = selectedFileName.replace(/\.[^/.]+$/, "");
  const newFileName = `${baseFileName}_결과.xlsx`;
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', newFileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function reset() {
  promotionColumns.forEach(column => {
    // Find index of column in validColumns
    const index = validColumns.indexOf(column);
    
    // If column exists in validColumns, remove it
    if (index > -1) {
        validColumns.splice(index, 1);
    }

    // Remove column from columnTypes
    delete columnTypes[column];
  });
  promotionColumns = [];
  console.log(promotionColumns);

  // Clear the selected file and show it again
  const input = document.getElementById('file');
  input.value = '';
  input.classList.remove('d-none');

  // Show the file select option
  const file = document.getElementById('file');
  file.hidden = false;

  // Hide the progress bar and set value to 0
  const progressBar = document.getElementById('progress-bar-part1');
  progressBar.style.width = '0%';
  progressBar.setAttribute('aria-valuenow', 0);
  progressBar.parentElement.classList.add('d-none');

  //Hide and disable the start button
  const startButton = document.getElementById('startButton');
  startButton.disabled = true;
  startButton.classList.add('d-none');

  //Hide and disable the download button
  const download = document.getElementById('download');
  download.disabled = true;
  download.classList.add('d-none');

  //Hide reset button
  const reset = document.getElementById('reset');
  reset.disabled = false;
  reset.classList.add('d-none');

  // Close the database connection before deleting the file
  db.close();
  fs.unlinkSync(dbPath);
  
  // Create a new database connection
  
  // Drop the table if it already exists and create it with the specified columns
  db.exec(`DROP TABLE IF EXISTS mytable`);
  const createTableSQL = `CREATE TABLE mytable (${validColumns.map(columnName => `\`${columnName}\` ${columnTypes[columnName]}`).join(', ')})`;
  db.exec(createTableSQL);
}

function closeDatabaseConnection() {
  if (!db.open) {
    console.log('The database connection is already closed.');
    return;
  }

  try {
    db.close();
    console.log('Closed the database connection.');
  } catch (err) {
    console.error(err.message);
  }
}