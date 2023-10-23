/*Webserial Terminal
Version 2.7 (15.06.23)
ASCII-Version of Webserial Terminal

Communication to specific sensor as well as to any serial device possible
received data must contain cr in order to get displayed
Multimeasurment possible but with spcific time frame (no endelss measurement)
no live update in graph*/

// IntervalIds of functions that are called in a specific frequency
let scrollIntervalId;
let newlineIntervalId;
let getTempIntervalId;
let getHumIntervalId;
let getTemp_HumIntervalId;
// variable that stores strings that are received from the serial portconverted from uInt8Array
let readValueString;
// Port Objekt
let port;
// reader object from port to read serial data
let reader;
let textDecoder;
// writer object from port to write serial data
let writer;
let textEncoder;
// Port connected?
let connected = false;
//newline aktivated?
let newLine = false;
// visualisation on?
//autoscroll activated
let autoScroll = false;
let visualisation = false;
// debug mode aktivated?
let debug = false;
// series of measurement running
let runningMeasurement = false;
// menu status (next to terminal)
let menu = "measurementSettings";
//Variable that helps identifying between temp and hum responses during transmition and receiving process
let parameterInChanel = "";
// variabel that indicates if there is a communication process between browser and device activ
let chanelBusy = false;
//counter if chanel is busy for to long (some error)
let busyCounter = 0;
// counter to differentiate between temp and hum measurement 
let measurementCounter;
// Commands for Sensor Firmware to receive temperature and humidity value
const getTemperature = new Uint8Array([71, 101, 116, 84, 101, 109, 112, 101, 114, 97, 116, 117, 114, 101, 33, 13]);
const getHumidity = new Uint8Array([71, 101, 116, 72, 117, 109, 105, 100, 105, 116, 121, 33, 13]);
// variables that store the settings for a measurement series
let measurand = "empty";
let measurementPeriod = 0;
let measurementTime = 0;
let manualStop = false;
// variables for the measured values
let correctTempValues = [];
let correctHumValues = [];
let readValueArray = [];
let exportData = [];
// global object that sores id of used root variables
let globalRootObject = {};
// global variables for temp an hum series of graph
let xAxis;
let tempSeries;
let humSeries;
//fiexes Axes?
let axesFixed = false;
// Axes Values
let tempUpper, tempLower, humUpper, humLower;
// scrollbar visible
let scrollBar = false;
// filename for Export
let filename = "";


// when opening the webpage this checks automatically if the serial api is supported in the used browser
if ("serial" in navigator) {
  document.getElementById("terminal").innerHTML += "The Web Serial API is supportet!<br>";
}
else {
  document.getElementById("terminal").innerHTML += "The Web Serial API is not supportet!<br>";
}


// this function creates a port object and allows a connection to a connected serial device 
// when thee is readable data awailable it will be displayed on the terminal container 
async function connectComPort() {
  if (connected == false) {
    // Prompt user to select any serial port. returns a SerialPort object. 
    // because of await the next code line is only executed once the preveous one is completed
    port = await navigator.serial.requestPort();
    let baudrate = document.getElementById("baudrate").value;
    document.getElementById("terminal").innerHTML += "Selected baudrate:  ";
    document.getElementById("terminal").innerHTML += baudrate;
    // Wait for the serial port to open.
    await port.open({ baudRate: baudrate });
    document.getElementById("terminal").innerHTML += "<br>Serial device connected!<br>";
    // change status of port button and connected variable
    document.getElementById("connect").innerHTML = "Disconnect";
    connected = true;
    autoscroll();
    while (port.readable) {
      // creates reader and locks readable to it
      reader = port.readable.getReader();
      try {
        while (true) {
          // returns two properties (value and done)
          //if done is true, the serial port has been closed or no more data is coming
          // value is an Uint8Array
          const { value, done } = await reader.read();
          if (done) {
            // Allow the serial port to be closed later. readable isnt locked any longer
            reader.releaseLock();
            break;
          }
          // if data is received it will be stored in an array (readValueArray)
          // Once this array contains a CR sign the array is converted to a string and displayed in the webpages terminal
          // if a serial measurement is running (runningMeasurement == true) the data is stored in another Object in saveData()
          // there is no interpretation of the data before it is displayed!!
          if (value) {
            if (debug) {
              document.getElementById("terminal").innerHTML += "this is the raw int8Array: ";
              document.getElementById("terminal").innerHTML += value;
              document.getElementById("terminal").innerHTML += "<br>";
            }

            //write Array chunk into Array for the whole message
            let length = readValueArray.length;
            for (let i = 0; i < value.length; i++) {
              readValueArray[length + i] = value[i];
            }
            // Cr indicates that meassage is completely received
            if (readValueArray.includes(13)) {
              // converion to string
              readValueString = uInt8ArraytoString(readValueArray);
              if (debug) {
                document.getElementById("terminal").innerHTML += "this is the complete Uint8Array: ";
                document.getElementById("terminal").innerHTML += readValueArray;
                document.getElementById("terminal").innerHTML += "<br>";
                document.getElementById("terminal").innerHTML += "this is the corresponding string: ";
                document.getElementById("terminal").innerHTML += readValueString;
                document.getElementById("terminal").innerHTML += "<br>";
              }
              if (runningMeasurement) {
                dataProcessing(readValueString);
              }
              else {
                if (parameterInChanel == "temp") {
                  let newValue = parseFloat(readValueString);
                  document.getElementById("terminal").innerHTML += "<br>Temperature:&nbsp;&nbsp;  ";
                  document.getElementById("terminal").innerHTML += newValue;
                  document.getElementById("terminal").innerHTML += " °C";
                }
                else if (parameterInChanel == "hum") {
                  let newValue = parseFloat(readValueString);
                  document.getElementById("terminal").innerHTML += "<br>Humidity:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ";
                  document.getElementById("terminal").innerHTML += newValue;
                  document.getElementById("terminal").innerHTML += " %";
                }
                // in case Cr & Lf is activated
                else {
                  if (newLine) {
                    let cr_lf_string = newlineCrLf(readValueString)
                    console.log(cr_lf_string);
                    document.getElementById("terminal").innerHTML += "<br>String value: ";
                    document.getElementById("terminal").innerHTML += cr_lf_string;
                  }
                  else {
                    console.log(readValueString);
                    document.getElementById("terminal").innerHTML += "<br>String value: ";
                    document.getElementById("terminal").innerHTML += readValueString;
                  }
                }
                parameterInChanel = "";
                chanelBusy = false;
                readValueArray.length = 0;
              }
            }
          }
        }
      }
      catch (error) {
        // TODO: Handle non-fatal read error.
      }
    }
    await port.close();
    document.getElementById("connect").innerHTML = "Connect";
    document.getElementById("baudrate").value = "";

    connected = false;
  }
  else {
    reader.releaseLock();
    await port.close();
    document.getElementById("connect").innerHTML = "Connect";
    document.getElementById("baudrate").value = "";

    connected = false;
  }
}


// function that allows to store the data of a serial measurement
// before safing the data its purpose is interpreted
function dataProcessing(dataString) {
  // converion from string to float

  let newValue = parseFloat(dataString);
  if (debug) {
    document.getElementById("terminal").innerHTML += "<br>float value: ";
    document.getElementById("terminal").innerHTML += newValue;
  }
  // generate exact date (and time)
  let date = new Date();
  if (parameterInChanel == "temp") {
    correctTempValues.push({ date: date, value: newValue });
    liveData(correctTempValues, tempSeries);
    measurementCounter++;
    document.getElementById("terminal").innerHTML += "<br>Temperature:&nbsp;&nbsp;  ";
    document.getElementById("terminal").innerHTML += newValue;
    document.getElementById("terminal").innerHTML += " °C";
    document.getElementById("terminal").innerHTML += "&nbsp;&emsp;&nbsp;Measurement No.";
    document.getElementById("terminal").innerHTML += measurementCounter;
  }
  else if (parameterInChanel == "hum") {
    correctHumValues.push({ date: date, value: newValue });
    liveData(correctHumValues, humSeries);
    measurementCounter++;
    document.getElementById("terminal").innerHTML += "<br>Humidity:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ";
    document.getElementById("terminal").innerHTML += newValue;
    document.getElementById("terminal").innerHTML += " %";
    document.getElementById("terminal").innerHTML += "&nbsp;&emsp;&nbsp;&nbsp;Measurement No. ";
    document.getElementById("terminal").innerHTML += measurementCounter;
  }

  if (measurand == "double") {
    //when both measurands are selected values of two consecutive measurements are stored at the same time have the same timestamp for both values
    if (measurementCounter % 2 == 0 && measurementCounter > 0) {
      exportData.push({ date: date, Temperature: correctTempValues[correctTempValues.length - 1].value, Humidity: correctHumValues[correctHumValues.length - 1].value });
    }
  }
  else if (measurand == "temp") {
    exportData.push({ date: date, Temperature: correctTempValues[correctTempValues.length - 1].value });
  }
  else if (measurand == "hum") {
    exportData.push({ date: date, Humidity: correctHumValues[correctHumValues.length - 1].value });
  }
  parameterInChanel = "";
  newValue = 0;
  chanelBusy = false;
  if (debug) {
    document.getElementById("terminal").innerHTML += "<br><br>Receiving Process done";
  }
  // the array is cleared for the next message
  readValueArray.length = 0;

}


// this function replaces cr and lf symbols with <br> in order to create new lines when the checkbox is checked
// it is activated when the corresponding button is pressed
function newlineCrLf(string) {
  let pos1 = 0;
  let pos2 = 0;
  let newString = string;
  while (true) {
    pos1 = pos2;
    pos1 = newString.indexOf("\r\n", pos1);
    if (pos1 == -1) {
      break;
    }
    pos2 = pos1 + 2;
    newString = newString.slice(0, pos1) + "<br>" + newString.slice(pos2);
  }
  return newString;
}

// this function converts a uint8Array that is passed to it and returns it as a string
function uInt8ArraytoString(array) {
  let out, i, len, c;
  let char2, char3;

  out = "";
  len = array.length;
  i = 0;
  while (i < len) {
    c = array[i++];
    switch (c >> 4) {
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break;
      case 12: case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(((c & 0x0F) << 12) |
          ((char2 & 0x3F) << 6) |
          ((char3 & 0x3F) << 0));
        break;
    }
  }

  return out;
}

// a simple function that writes the passed argument to the connected port
// the variable has to be a uint8Array!
async function writeToPort(data) {
  if (debug) {
    document.getElementById("terminal").innerHTML += "<br><br>Transmition process:<br> ";
  }
  if (!chanelBusy) {
    if (debug) {
      document.getElementById("terminal").innerHTML += "<br>If ChanelBusy is false the telegram will be transmitted: ";
      document.getElementById("terminal").innerHTML += chanelBusy;
      document.getElementById("terminal").innerHTML += "<br><br>";

    }
    writer = port.writable.getWriter();
    await writer.write(data);
    writer.releaseLock();
    if (debug) {
      document.getElementById("terminal").innerHTML += "<br>message sent!";
     

    }

    if (data[3] == 84) {
      parameterInChanel = "temp";
    }
    else if (data[3] == 72) {
      parameterInChanel = "hum";
    }
    else {
      parameterInChanel = "undefined";
    }
    chanelBusy = true;
    busyCounter = 0;
    if (debug) {
      document.getElementById("terminal").innerHTML += "<br>chenalBusy must be true:  ";
      document.getElementById("terminal").innerHTML += chanelBusy;
      document.getElementById("terminal").innerHTML += "<br><br>";

    }
  }
  else {
    document.getElementById("terminal").innerHTML += "<br>Chanel is busy, Telegram not transmitted!<br><br>";
    busyCounter++;
    if (busyCounter >= 5) {
      reader.releaseLock();
      chanelBusy = false;
      document.getElementById("terminal").innerHTML += "<br>busycounter must be 5 or more ";
      document.getElementById("terminal").innerHTML += busyCounter;
      document.getElementById("terminal").innerHTML += "<br>ChanelBusy must be false:<br><br>";
      document.getElementById("terminal").innerHTML += chanelBusy;
      correctHumValues.lenght = 0;
      correctHumValues.length = 0;
      readValueArray.length = 0;
      reader = port.readable.getReader();
    }
  }
}

// this function converts a string that is manually written into an input field to a UintArray
// and writes the value to the connected port
async function manualInput() {
  let inputValue = document.getElementById("manualTransmit").value;
  inputValue += "\r";

  textEncoder = new TextEncoder();
  let uIntArray = textEncoder.encode(inputValue);
  writeToPort(uIntArray);

  document.getElementById("manualTransmit").value = "";
}

// this function writes the commands for temperature and humidity to the port
// it is implemented seperately because there needs to be a specific time 
// inbetween commands in order for them to work properly
async function getTemp_Hum() {
  writeToPort(getTemperature);
  setTimeout(() => { writeToPort(getHumidity) }, 1000);
}



// this function replaces the html elements of the terminal container with the elements of the settings
// when the button 'serial measurements' is pressed
function showSettings() {
  document.getElementById("display").innerHTML = document.getElementById("settings").innerHTML;
}

// this function shows or hides the setting for specific measurment time 
//depending on the checkbox continuous measurment beiing checked
function hideTimeSetting() {
  if (document.getElementById("manualStop").checked) {
    document.getElementById("measurementTime").style.display = "none";
    document.getElementById("lableMeasTime").style.display = "none";
    manualStop = true;

  }
  else {
    document.getElementById("measurementTime").style.display = "block";
    document.getElementById("lableMeasTime").style.display = "block";
    manualStop = false;
  }
}

// this function stores the values of the settings in global variables
// when the button 'save' is pressed
// it displays the saved settings on the webpages terminal
function saveSettings() {
  let validSettings = true;
  if (document.getElementById("tempMeasurement").checked && document.getElementById("humMeasurement").checked) {
    measurand = "double";
  }
  else if (document.getElementById("tempMeasurement").checked && !document.getElementById("humMeasurement").checked) {
    measurand = "temp";
  }
  else if (!document.getElementById("tempMeasurement").checked && document.getElementById("humMeasurement").checked) {
    measurand = "hum";
  }
  else {
    measurand = "empty";
  }
  measurementPeriod = document.getElementById("period").value;
  measurementTime = document.getElementById("measurementTime").value;
  // error warnings
  if ((measurementPeriod < 2 && measurand == "double") || (measurementPeriod < 1 && (measurand == "temp" || measurand == "hum"))) {
    window.alert("the measurment period is to low for the selected measurand configuration. Please select a higher period.");
    validSettings = false;
  }
  else if (measurand == "empty" || measurand == "") {
    window.alert("You need to select at least one measurand");
    validSettings = false;
  }
  else if (manualStop == false && measurementTime == 0) {
    window.alert("Please chose a Measurement Time or select the manual stop option.");
    validSettings = false;
  }
  if (validSettings) {
    document.getElementById("startMeasurement").innerHTML = "Start";
    document.getElementById("startMeasurement").style.display = "block";
    document.getElementById("startMeasurement").style.backgroundColor = "green";
    document.getElementById("display").innerHTML = '<div id="terminal" class="containerTerminal"></div>';
    document.getElementById("terminal").innerHTML = "Measurement Parameters:<br><br>";
    document.getElementById("terminal").innerHTML += "Measurand: ";
    if (measurand == "temp") document.getElementById("terminal").innerHTML += "Temperature ";
    else if (measurand == "hum") document.getElementById("terminal").innerHTML += "Humidity ";
    else if (measurand == "double") document.getElementById("terminal").innerHTML += "Temperature & Humidity ";
    if (manualStop == true) {
      document.getElementById("terminal").innerHTML += "<br>Measurement will be stopped manually ";
    }
    else {
      document.getElementById("terminal").innerHTML += "<br>Total measurement time: ";
      document.getElementById("terminal").innerHTML += measurementTime;
      document.getElementById("terminal").innerHTML += " Second/s";

    }
    document.getElementById("terminal").innerHTML += "<br>Measurement period: ";
    document.getElementById("terminal").innerHTML += measurementPeriod;
    document.getElementById("terminal").innerHTML += " Second/s";
    document.getElementById("terminal").innerHTML += "<br><br>In order to start the measurement press the Start button!";
    document.getElementById("visualize").style.display = "block";
  }

}

// this function starts the serial measurements with the global variables with the saved values from settings
// depending on the measurands interval functions are called in a specific frequency for a certain time before they are stopped
async function startMeasurements() {
  if (connected) {
    if (runningMeasurement == false) {
      document.getElementById("terminal").innerHTML = "";
      //clear terminal content
      document.getElementById("terminal").innerHTML = "";
      // set measurment intervals depending on the measurand
      // and measurmentPeriod setting
      if (measurand == "double") {
        getTemp_HumIntervalId = setInterval(getTemp_Hum, (measurementPeriod * 1000));
      }
      else if (measurand == "temp") {
        getTempIntervalId = setInterval(() => { writeToPort(getTemperature); }, measurementPeriod * 1000);

      }
      else if (measurand == "hum") {
        getHumIntervalId = setInterval(() => { writeToPort(getHumidity); }, measurementPeriod * 1000);
      }
      else {
        window.alert("Save settings before starting the measurement!");
      }
      // if settings are valid
      if (measurand != "empty") {
        measurementCounter = 0;       // initialize measurement counter
        runningMeasurement = true;    // set running measurement variable true
        correctTempValues.length = 0; // clear arrays for measurement values
        correctHumValues.length = 0;
        exportData.length = 0;
        visualisation = false;        // set visualization variable false (so graph can be displayed when the buton is pressed)
        document.getElementById("visualize").innerHTML = "Show graph"; // put correct content in button when measurement is finished 
        document.getElementById("results").style.display = "none";  // hide graph during running measurement
        document.getElementById("visualize").style.backgroundColor = "green";
        am5ready();   //build the chart
        //switch to chart settings
        document.getElementById("measurementSettings").style.display = "none";
        document.getElementById("chartSettings").style.display = "block";
        document.getElementById("back").style.display = "none";
        menu = "chartSettings";
        // disbable buttons for singlemeasurements during series
        document.getElementById("getTemp").disabled = true;
        document.getElementById("getHum").disabled = true;
        // checking wether measurement is stopped manually
        if (manualStop == false) {
          // timeout functions considering the measurmentTime Variables setted
          setTimeout(() => {
            clearInterval(getTempIntervalId); clearInterval(getHumIntervalId);
            clearInterval(getTemp_HumIntervalId)
          }, measurementTime * 1000);
          setTimeout(measurementFinished, measurementTime * 1000 + 1000);
          document.getElementById("startMeasurement").style.display = "none";
        }
        // if measurement is stopped manually
        else {
          document.getElementById("startMeasurement").innerHTML = "Stop"; // change content of start button
          document.getElementById("startMeasurement").style.backgroundColor = "red";
        }
      }
      else {
        document.getElementById("terminal").innerHTML += "<br>You need to select at least one measurand before starting the measurement!<br>";
      }
    }
    // stop button (red) is pressed
    else {
      clearInterval(getTempIntervalId);
      clearInterval(getHumIntervalId);
      clearInterval(getTemp_HumIntervalId);
      await setTimeout(1000);
      document.getElementById("terminal").innerHTML += "<br><br>Measurement Done!";
      document.getElementById("terminal").innerHTML += "<br>Total number of saved values:";
      document.getElementById("terminal").innerHTML += measurementCounter;
      document.getElementById("terminal").innerHTML += "<br><br>";
      runningMeasurement = false;
      document.getElementById("startMeasurement").innerHTML = "Start";
      document.getElementById("startMeasurement").style.backgroundColor = "green";
      document.getElementById("back").style.display = "block";

      document.getElementById("getTemp").disabled = false;
      document.getElementById("getHum").disabled = false;
    }

  }
  else {
    window.alert("Connect to COM Port first");
  }
}

// function is callled in the function above when the measurement is finished
function measurementFinished() {
  document.getElementById("terminal").innerHTML += "<br><br>Measurement Done!";
  document.getElementById("terminal").innerHTML += "<br>Total number of saved values: ";
  document.getElementById("terminal").innerHTML += measurementCounter;
  document.getElementById("terminal").innerHTML += "<br><br>";
  document.getElementById("startMeasurement").innerHTML = "Start";
  runningMeasurement = false;
  document.getElementById("startMeasurement").style.display = "block";
  document.getElementById("back").style.display = "block";
  document.getElementById("getTemp").disabled = false;
  document.getElementById("getHum").disabled = false;
}



//funktion to ativate or deactivate the debug mode
function debugMode() {
  if (debug == false) {
    document.getElementById("debugButton").innerHTML = "Disable debug";
    debug = true;
  }
  else if (debug == true) {
    document.getElementById("debugButton").innerHTML = "Enable debug";
    debug = false;
  }
}

// this function clears the content of the webpages terminal
function clearTerminal() {
  document.getElementById("terminal").innerHTML = "";

}

// this function calles the autoscroll function when the corrsponding button is pressed
function autoscroll() {
  if (autoScroll == false) {
    scrollIntervalId = setInterval(scrolling, 1000 / 5);
    document.getElementById("autoscroll").innerHTML = "Disable Autoscroll";
    autoScroll = true;
  }
  else {
    clearInterval(scrollIntervalId);
    document.getElementById("autoscroll").innerHTML = "Enable Autoscroll";
    autoScroll = false;
  }
}

// this function enables autoscroll when there is an overflow in the y-axis of the terminal
function scrolling() {
  let scrollBox = document.getElementById("terminal");
  if (scrollBox.scrollTop < (scrollBox.scrollHeight - scrollBox.offsetHeight)) {
    scrollBox.scrollTop = scrollBox.scrollHeight;
  }
}

function autoNewline() {
  if (newLine == true) {
    document.getElementById("newLine").innerHTML = "Enable auto-newline"
    newLine = false;
  }
  else if (newLine == false) {
    document.getElementById("newLine").innerHTML = "Disable auto-newline"
    newLine = true;
  }
}

// this function replaces the html elements of the terminal container with the elements of the results
// when a measurement series is finished (visualisation graph)
function showResults() {
  if (visualisation == false) {
    document.getElementById("results").style.display = "block";
    document.getElementById("visualize").innerHTML = "Hide results";
    document.getElementById("visualize").style.backgroundColor = "red";
    visualisation = true;
  }
  else {
    document.getElementById("results").style.display = "none";
    document.getElementById("visualize").innerHTML = "Show results";
    document.getElementById("visualize").style.backgroundColor = "green";

    visualisation = false;
  }
}

function backToMeasurements(){
  document.getElementById("measurementSettings").style.display = "block";
  document.getElementById("chartSettings").style.display = "none";
}


function fixAxes() {
  if (axesFixed == false) {
    document.getElementById("visualize").style.display = "none";
    document.getElementById("scrollbar").style.display = "none";
    document.getElementById("fixedAxes").style.display = "none";
    document.getElementById("export").style.display = "none";


    document.getElementById("axesValues").style.display = "block";
    document.getElementById("fixedAxes").innerHTML = "Free axes";
    axesFixed = true;

  }
  else if (axesFixed == true) {
    document.getElementById("fixedAxes").innerHTML = " Fix axes";

    axesFixed = false;
    if (runningMeasurement) {
      am5ready();
    }
  }
}

function submitAxesSettings() {
  let tUpper = document.getElementById("tempUpper").value;
  let tLower = document.getElementById("tempLower").value;
  let hUpper = document.getElementById("humUpper").value;
  let hLower = document.getElementById("humLower").value;
  tempUpper = parseInt(tUpper);
  tempLower = parseInt(tLower);
  humUpper = parseInt(hUpper);
  humLower = parseInt(hLower);
  document.getElementById("terminal").innerHTML += tempUpper;
  document.getElementById("terminal").innerHTML += tempLower;
  document.getElementById("terminal").innerHTML += humUpper;
  document.getElementById("terminal").innerHTML += humLower;

  document.getElementById("axesValues").style.display = "none";
  document.getElementById("visualize").style.display = "block";
  document.getElementById("scrollbar").style.display = "block";
  document.getElementById("fixedAxes").style.display = "block";
  document.getElementById("export").style.display = "block";

  axesFixed = true;
  if (runningMeasurement) {
    am5ready();
  }
}

function scrollbar() {
  if (scrollBar == false) {
    document.getElementById("scrollbar").innerHTML = "Remove scrollbar";
    scrollBar = true;
  }
  else if (scrollBar == true) {
    document.getElementById("scrollbar").innerHTML = "Add scrollbar";

    scrollBar = false;
  }
  if (runningMeasurement) {
    am5ready();
  }
}

function exportSettings() {
  document.getElementById("export").style.display = "none";
  document.getElementById("visualize").style.display = "none";
  document.getElementById("scrollbar").style.display = "none";
  document.getElementById("fixedAxes").style.display = "none";
  document.getElementById("exportSettings").style.display = "block";
}

function saveExportSettings() {
  filename = document.getElementById("fileName").value;
  am5ready();
  document.getElementById("exportSettings").style.display = "none";
  document.getElementById("export").style.display = "block";
  document.getElementById("visualize").style.display = "block";
  document.getElementById("scrollbar").style.display = "block";
  document.getElementById("fixedAxes").style.display = "block";

}




// this function creates a chart with specific attributes
// as the values it used the measurments stored in gobal variables
// it is called in the function measurementFinished()
function am5ready() {

  // checks if root object already exists. If so it will be deleted so a new chat with correct values can be
  if (globalRootObject[chartdiv]) {
    globalRootObject[chartdiv].dispose();
  }
  // Create root element
  var root = am5.Root.new("chartdiv");
  globalRootObject[chartdiv] = root;
  // Set themes
  root.setThemes([
    am5themes_Animated.new(root)
  ]);
  // Create chart
  let chart = root.container.children.push(
    am5xy.XYChart.new(root, {
      focusable: true,
      panX: true,
      panY: true,
      wheelX: "panX",
      wheelY: "zoomX",
      pinchZoomX: true
    })
  );

  // different colors for individual series
  chart.get("colors").set("step", 8);

  // Create axes
  xAxis = chart.xAxes.push(
    am5xy.DateAxis.new(root, {
      maxDeviation: 0.1,
      groupData: false,
      baseInterval: {
        timeUnit: "second", //"second"
        count: 1
      },

      // renderer displays objects on the screen
      renderer: am5xy.AxisRendererX.new(root, {}),
      tooltip: am5.Tooltip.new(root, {})

    })
  );

  var yRendererH = am5xy.AxisRendererY.new(root, {
    opposite: true
  });
  var yRendererT = am5xy.AxisRendererY.new(root, {
    opposite: false
  });


  if (axesFixed) {
    var yAxisH = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        maxDeviation: 1,
        renderer: yRendererH,
        // comment out the next two lines if you rather have variable axis ranges
        min: humLower,
        max: humUpper,
      })
    );
    var yAxisT = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        maxDeviation: 1,
        renderer: yRendererT,
        // comment out the next two lines if you rather have variable axis ranges
        min: tempLower,
        max: tempUpper,
      })
    );
  }
  else {
    var yAxisH = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        maxDeviation: 1,
        renderer: yRendererH,
        // comment out the next two lines if you rather have variable axis ranges
        //min: 0,
        //max: 100,
      })
    );
    var yAxisT = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        maxDeviation: 1,
        renderer: yRendererT,
        // comment out the next two lines if you rather have variable axis ranges
        //min: 0,
        //max: 50,
      })
    );
  }



  // yAxis.children.push() creates the label as the last element
  // in case of the Humidity the label needs to be last element because the axis is on the right side of the graph
  yAxisH.children.push(
    am5.Label.new(root, {
      rotation: -90,
      text: "Humidity",
      y: am5.p50,
      centerX: am5.p50
    })
  );
  // yAxis.children.unshift() creates the label as first element
  yAxisT.children.unshift(
    am5.Label.new(root, {
      rotation: -90,
      text: "Temperature",
      y: am5.p50,
      centerX: am5.p50
    })
  );

  /*
   if (chart.yAxes.indexOf(yAxis) > 0) {
     yAxis.set("syncWithAxis", chart.yAxes.getIndex(0));
   }
   */

  // Add series
  humSeries = chart.series.push(
    am5xy.LineSeries.new(root, {
      xAxis: xAxis,
      yAxis: yAxisH,
      valueYField: "value",
      valueXField: "date",
      tooltip: am5.Tooltip.new(root, {
        pointerOrientation: "horizontal",
        labelText: "{valueY}"
      })
    })
  );
  tempSeries = chart.series.push(
    am5xy.LineSeries.new(root, {
      xAxis: xAxis,
      yAxis: yAxisT,
      valueYField: "value",
      valueXField: "date",
      tooltip: am5.Tooltip.new(root, {
        pointerOrientation: "horizontal",
        labelText: "{valueY}"
      })
    })
  );

  // set the thickness of the lines
  humSeries.strokes.template.setAll({ strokeWidth: 2 });
  tempSeries.strokes.template.setAll({ strokeWidth: 2 });

  // set grid thickness
  yRendererH.grid.template.set("strokeOpacity", 0.1);
  yRendererH.labels.template.set("fill", humSeries.get("fill"));
  yRendererH.setAll({
    stroke: humSeries.get("fill"),
    strokeOpacity: 1,
    opacity: 1
  });
  yRendererT.grid.template.set("strokeOpacity", 0.1);
  yRendererT.labels.template.set("fill", tempSeries.get("fill"));
  yRendererT.setAll({
    stroke: tempSeries.get("fill"),
    strokeOpacity: 1,
    opacity: 1
  });

  // Set up data processor to parse string dates
  humSeries.data.processor = am5.DataProcessor.new(root, {
    dateFields: ["date"]
  });
  tempSeries.data.processor = am5.DataProcessor.new(root, {
    dateFields: ["date"]
  });

  humSeries.data.setAll(correctHumValues);
  tempSeries.data.setAll(correctTempValues);

  // Add cursor
  var cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
    xAxis: xAxis,
    behavior: "none"
  }));
  cursor.lineY.set("visible", false);

  // add scrollbar
  var scrollbarX = am5xy.XYChartScrollbar.new(root, {
    orientation: "horizontal",
    height: 10
  });


  if (scrollBar) {
    // assign it and place it on the charts bottom
    chart.set("scrollbarX", scrollbarX);
    chart.bottomAxesContainer.children.push(scrollbarX);
  }

  var exporting = am5plugins_exporting.Exporting.new(root, {
    menu: am5plugins_exporting.ExportingMenu.new(root, {}),
    filePrefix: filename,
    dataSource: exportData,
    dateFields: ["date"],
    dateFormat: "HH:mm:ss",
    pngOptions: {
      quality: 1,
      maintainPixelRatio: true
    },
    jpgOptions: {
      quality: 1
    },
    xlsxOptions: {
      addColumnNames: true,
      emptyAs: ""
    },
    csvOptions: {
      addColumnNames: true,
      addBOM: true,
      emptyAs: ""
    },
    pdfdataOptions: {
      addColumnNames: true,
      emptyAs: ""
    },
    pdfOptions: {
      addURL: false,
      includeData: true,
      quality: 1
    }
  });


  // Make stuff animate on load
  chart.appear(1000, 100);
}

// this function adds the latest objects of the data arrays to the series of the chart. 
// It is called in the function saveData() whenever a new value is added to the array
function liveData(measurementValue, axisSeries) {
  let size = measurementValue.length;
  let newestValue = measurementValue[size - 1];

  axisSeries.data.push(newestValue);

}
