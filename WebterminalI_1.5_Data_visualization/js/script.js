/*Webserial Terminal 
Sebastian Braun

ModbusRTU-Module-Version of Webserial Terminal - 1.5 Data visualization

whats new?

- chart elements and structure
- live data update
- data export

  
New features of this version are marked with comments explaining the commands.
Pleae note that there are many changes aswell in the corresponding html file.
There are no comments since these are rather self explanatory.

Unlike in the previous version there is no CRC check and fixed commands are used!
This keeps the functions a lot shorter which hopefully guides the focus to the data visualization


For more advanced usage of the chartsettings please look at the code of the complete Modbus-Webterminal
The amcharts functionallities are very well documented.
They can be checked on this website: https://www.amcharts.com/docs/v5/concepts/



            
*/

/**************GLOBAL vARIABLES*********************************************************************************/

let scrollIntervalId;
let getTempIntervalId;
let busyCounterIntervalId = 0;

let port;
let reader;
let writer;


let connected = false;
let debug = false;
let autoScroll = false;
let chanelBusy = false;
let busyCounter = 0;






const getTemperature = new Uint8Array([1, 3, 0, 0, 0, 1, 132, 10]);
let readValueArray = [];
let correctTempValues = [];

let measurementPeriod = 0;
let measurementTime = 0;
let manualStop = false;

let runningMeasurement = false;
let measurementCounter;

// visualisation on?
let visualisation = false;
// variable that stores temperaturealues as well as time stamps and will be exported 
let exportData = [];
// filename for Export
let filename = "";
// Variables for Chart Objects
// global object that sores id of used root variables
let globalRootObject = {};
// variable for the tempSeries in the chart
let tempSeries;


/******************************************************************************************************************************************* */


if ("serial" in navigator) {
  document.getElementById("terminal").innerHTML += "The Web Serial API is supportet!<br>";
}
else {
  document.getElementById("terminal").innerHTML += "The Web Serial API is not supportet!<br>";
}

/***********************************************Functions for Port Interaction**************************************************************** */


async function connectComPort() {
  if (connected == false) {
    port = await navigator.serial.requestPort();
    let baudrate = document.getElementById("baudrate").value;
    let dataBits = document.getElementById("data").value;
    let stopBits = document.getElementById("stop").value;
    let parity = document.getElementById("parity").value;
    await port.open({ baudRate: baudrate, dataBits: dataBits, stopBits: stopBits, parity: parity });
    connected = true;

    document.getElementById("terminal").innerHTML += "<br>Serial device connected!<br><br><br>";
    document.getElementById("connect").innerHTML = "Disconnect";
    while (port.readable) {
      reader = port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            reader.releaseLock();
            break;
          }
          if (value) {
            if (debug) {
              document.getElementById("terminal").innerHTML += "<br>this is a raw received int8Array: ";
              document.getElementById("terminal").innerHTML += value;
            }
            let length = readValueArray.length;
            for (let i = 0; i < value.length; i++) {
              readValueArray[length + i] = value[i];

            }
            if (readValueArray.length == 7) {
              clearInterval(busyCounterIntervalId);
              busyCounterIntervalId = 0;
              dataProcessing(readValueArray);
            }
          }
        }
      }
      catch (error) {
      }
    }
    await port.close();
    document.getElementById("connect").innerHTML = "Connect";
    document.getElementById("baudrate").value = "";
    document.getElementById("getTemp").style.backgroundColor = "white";
    connected = false;
  }
  else {
    if (runningMeasurement) {
      startMeasurements();
    }
    reader.releaseLock();
    await port.close();
    document.getElementById("connect").innerHTML = "Connect";
    document.getElementById("baudrate").value = "";
    document.getElementById("getTemp").style.backgroundColor = "white";
    connected = false;
  }
}

/***************************************Functions for Processing Data********************************************************************** */


function dataProcessing(array) {
  if (debug) {
    document.getElementById("terminal").innerHTML += "<br><br><h2>Receiving Process:</h2>";
    document.getElementById("terminal").innerHTML += "this is the assembled int8Array: ";
    document.getElementById("terminal").innerHTML += readValueArray;
  }
  let dataBytes = array.slice(3, 5);
  let hexString = Array.from(dataBytes).map((i) => i.toString(16).padStart(2, '0')).join('');
  let decimal = parseInt(hexString, 16);
  let float = parseFloat(decimal);

  let newValue = float / 100 - 100;
  newValue = parseFloat(newValue.toFixed(2))
  if (debug) {
    document.getElementById("terminal").innerHTML += "sliced two Data-Bytes: ";
    document.getElementById("terminal").innerHTML += dataBytes;
    document.getElementById("terminal").innerHTML += " (the Bytes are swapped and then converted to hex)";
    document.getElementById("terminal").innerHTML += "<br>hex value: ";
    document.getElementById("terminal").innerHTML += hexString;
    document.getElementById("terminal").innerHTML += "<br>Decimal number: ";
    document.getElementById("terminal").innerHTML += decimal;
    document.getElementById("terminal").innerHTML += "<br>";
  }
  let date = new Date();
  // we make a new object entry in the array in json format using the date variable and the processed received temperature value
  // this array is used to visualize thg data in a chart
  correctTempValues.push({ date: date, value: newValue });
  // every time a value is received a live update of the charts data is excecuted
  // you can find the declaration of liveData() at the bottom of the script
  liveData(correctTempValues);
  // the new value is also pushed into the array that can be exported from the chart after the measurement is finished
  exportData.push({ date: date, Temperature: correctTempValues[correctTempValues.length - 1].value });

  document.getElementById("terminal").innerHTML += "<br>Temperature:&nbsp;&nbsp;  ";
  document.getElementById("terminal").innerHTML += newValue;
  document.getElementById("terminal").innerHTML += " °C";
  if (debug) {
    document.getElementById("terminal").innerHTML += "<br><br>Receiving Process done";
  }
  measurementCounter++;
  chanelBusy = false;
  readValueArray.length = 0;
}


/***************************************Functions for Transmitting Data********************************************************************** */



async function writeToPort(data) {
  if (!chanelBusy) {
    writer = port.writable.getWriter();
    await writer.write(data);
    if (debug) {
      document.getElementById("terminal").innerHTML += "<br><h2>Transmission Process<h2/>";
      document.getElementById("terminal").innerHTML += "<br>Chanel is free, message can be sent";
      document.getElementById("terminal").innerHTML += "<br>Message:";
      document.getElementById("terminal").innerHTML += data;
      document.getElementById("terminal").innerHTML += "<br>Message send successfully! ";
      document.getElementById("terminal").innerHTML += "<br>Transmission process done";
      document.getElementById("terminal").innerHTML += "<br><br>";
    }
    writer.releaseLock();

    chanelBusy = true;
    busyCounter = 0;
    if (busyCounterIntervalId == 0) {
      busyCounterIntervalId = setInterval(incrementBusyCounter, 100);
    }
  }
  else {
    document.getElementById("terminal").innerHTML += "<br>Chanel is busy, Telegram not transmitted!<br><br>";

  }
}

function incrementBusyCounter() {
  busyCounter++;
  if (busyCounter == ((measurementPeriod * 10) - 1)) {
    chanelBusy = false;
    busyCounter = 0;
    if (debug) {
      document.getElementById("terminal").innerHTML += "<br><h4>ChanelBusy has been set = false due to timeout!</h4>";

    }
  }
}


/**************************************Functions for Diesplay & Terminal settings*************************************************************************** */

function showSettings() {
  if (!runningMeasurement) {
    document.getElementById("display").innerHTML = document.getElementById("settings").innerHTML;
    document.getElementById("startMeasurement").style.display = "none";
    document.getElementById("measurement").style.display = "none";
    document.getElementById("visualize").style.display = "none";
    document.getElementById("safeSettings").style.display = "block";
    document.getElementById("safeSettings").style.backgroundColor = "green";
    manualStop = false;
  }
}


function safeSettings() {
  measurementPeriod = document.getElementById("period").value;
  measurementTime = document.getElementById("measurementTime").value;
  if (document.getElementById("manualStop").checked) {
    manualStop = true;
  }
  else {
    manualStop = false;
  }
  if (measurementPeriod < 1) {
    window.alert("The measurment frequency is to fast foer the selected measurands. For further limitations click the info button");
  }
  else if (manualStop == false && measurementTime == 0) {
    window.alert("Please chose a Measurement Time or select the manual stop option.");
  }
  else {
    if (debug) {
      document.getElementById("terminal").style.fontSize = "1vw";
    }
    document.getElementById("safeSettings").style.display = "none";
    document.getElementById("safeSettings").style.backgroundColor = "white";
    document.getElementById("startMeasurement").innerHTML = "Start";
    document.getElementById("startMeasurement").style.display = "block";
    document.getElementById("startMeasurement").style.backgroundColor = "green";
    document.getElementById("measurement").style.display = "block";
    document.getElementById("display").innerHTML = '<div id="terminal" class="containerTerminal"></div>';
    document.getElementById("terminal").innerHTML = "Measurement Parameters:<br><br>";
    document.getElementById("terminal").innerHTML += "<br>Measurand: ";
    document.getElementById("terminal").innerHTML += "Temperature ";
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
  }

}


/**********************************************Functions about enabling measurements************************************************************************* */

async function startMeasurements() {
  if (connected) {

    if (runningMeasurement == false) {
      document.getElementById("terminal").innerHTML = "";
      getTempIntervalId = setInterval(() => { writeToPort(getTemperature); }, measurementPeriod * 1000);
      measurementCounter = 0;
      runningMeasurement = true;
      // clear array for measurement values
      correctTempValues.length = 0;
      document.getElementById("measurement").style.display = "none";
      document.getElementById("visualize").style.display = "block";
      document.getElementById("visualize").innerHTML = "Show Chart";
      document.getElementById("visualize").style.backgroundColor = "green";
      // hide graph when starting a new measurement
      document.getElementById("results").style.display = "none";

      //build the chart
      // the declaration of the function can be seen at the bottom of the script
      am5ready();
      if (manualStop == false) {
        setTimeout(() => {
          clearInterval(getTempIntervalId)
        }, measurementTime * 1000);
        setTimeout(measurementFinished, measurementTime * 1000 + 1000);
        document.getElementById("startMeasurement").style.display = "none";
      }
      else {
        document.getElementById("startMeasurement").style.display = "block";
        document.getElementById("startMeasurement").innerHTML = "Stop";
        document.getElementById("startMeasurement").style.backgroundColor = "red";
      }

    }
    else {
      clearInterval(getTempIntervalId);
      await setTimeout(1000);
      document.getElementById("terminal").innerHTML += "<br><br>Measurement Done!";
      document.getElementById("terminal").innerHTML += "<br>Total number of saved values:";
      document.getElementById("terminal").innerHTML += measurementCounter;
      document.getElementById("terminal").innerHTML += "<br><br>";
      runningMeasurement = false;
      document.getElementById("startMeasurement").innerHTML = "Start";
      document.getElementById("startMeasurement").style.backgroundColor = "green";
      document.getElementById("measurement").style.display = "block";    //show measurment-settings button
      clearInterval(busyCounterIntervalId);
      busyCounterIntervalId = 0;
    }
  }
  else {
    // error warning if port connection is not active
    window.alert("Connect to COM Port first");
  }
}

// function is callled in the function above when the measurement is not finished manually
function measurementFinished() {
  // display measurement results
  document.getElementById("terminal").innerHTML += "<br><br>Measurement Done!";
  document.getElementById("terminal").innerHTML += "<br>Total number of saved values: ";
  document.getElementById("terminal").innerHTML += measurementCounter;
  document.getElementById("terminal").innerHTML += "<br><br>";
  runningMeasurement = false;
  document.getElementById("startMeasurement").innerHTML = "Start";
  document.getElementById("startMeasurement").style.display = "block";
  document.getElementById("measurement").style.display = "block";
  clearInterval(busyCounterIntervalId);
  busyCounterIntervalId = 0;
}



function clearTerminal() {
  document.getElementById("terminal").innerHTML = "";

}

function autoscroll() {
  if (!autoScroll) {

    scrollIntervalId = setInterval(scrolling, 1000 / 5);
    document.getElementById("autoscroll").innerHTML = "Disable Autoscroll";
    autoScroll = true;
  }
  else if (autoScroll) {
    clearInterval(scrollIntervalId);
    document.getElementById("autoscroll").innerHTML = "Enable Autoscroll";
    autoScroll = false
  }
}

function scrolling() {
  let scrollBox = document.getElementById("terminal");
  if (scrollBox.scrollTop < (scrollBox.scrollHeight - scrollBox.offsetHeight)) {
    scrollBox.scrollTop = scrollBox.scrollHeight;
  }
}


function enableDebug() {
  if (debug == false) {
    document.getElementById("debugButton").innerHTML = "Disable Debug";
    document.getElementById("terminal").style.fontSize = "1vw";
    debug = true;
  }
  else if (debug == true) {
    document.getElementById("debugButton").innerHTML = "Enable Debug";
    document.getElementById("terminal").style.fontSize = "1.5vw";

    debug = false;
  }
}

// this function allows to show or hide the visualisation graph
// when a measurement series is finished 
// other html elements will be hidden
function showResults() {

  if (visualisation == false) {
    document.getElementById("results").style.display = "block";
    document.getElementById("visualize").style.backgroundColor = "red";
    document.getElementById("visualize").innerHTML = "Hide chart";
    document.getElementById("export").style.display = "block";



    visualisation = true;
  }
  else {
    document.getElementById("results").style.display = "none";
    document.getElementById("visualize").style.backgroundColor = "green";
    document.getElementById("visualize").innerHTML = "Show chart";
    document.getElementById("export").style.display = "none";
    visualisation = false;
  }

}

// this function is called when the "Export settings" button is pressed
// it replaces the button with an input field to set the filename for the export
function exportSettings() {
  if (document.getElementById("export").innerHTML == "Export Settings") {
    document.getElementById("export").innerHTML = "submit";
    document.getElementById("visualize").style.display = "none";
    document.getElementById("exportInput").style.display = "block";
  }
  else if (document.getElementById("export").innerHTML == "submit") {
    filename = document.getElementById("file").value;
    am5ready();
    document.getElementById("export").innerHTML = "Export Settings";
    document.getElementById("visualize").style.display = "block";
    document.getElementById("exportInput").style.display = "none";
  }
}

// this function creates a chart with specific attributes
// as the values it uses the measurments stored in correctTemValues
// it is called in the function measurementFinished() as well as in the function exportsettings()
// all relevant elements of the chart are created inside this function
// some of them are optional
function am5ready() {

  // checks if root object already exists.
  // when a new measurmenet is started the old object is deleted and a new one can be created
  // otherwise the chart can only be used once
  if (globalRootObject[chartdiv]) {
    globalRootObject[chartdiv].dispose();
  }
  // Create root element
  // the string passed as a parameter is the div in the html file that will host the chart
  // it needs to be further designed in the CSS file in order to display the chart completely
  let root = am5.Root.new("chartdiv");
  globalRootObject[chartdiv] = root;

  // Set themes (optinal)
  // a list of themes can be seen in the amcharts5 documentary
  root.setThemes([
    am5themes_Animated.new(root)
  ]);

  // Create chart
  let chart = root.container.children.push(
    am5xy.XYChart.new(root, {
      layout: root.verticalLayout,
      focusable: true,
      panX: true,
      panY: true,
      wheelX: "panX",
      wheelY: "zoomX",
      pinchZoomX: true
    })
  );

  // different colors for individual series (optional)
  chart.get("colors").set("step", 8);

  // create label / header for chart (optional)
  chart.children.unshift(am5.Label.new(root, {
    text: "Temperature Measurement",
    fontSize: 25,
    fontWeight: "300",
    textAlign: "center",
    x: am5.percent(50),
    centerX: am5.percent(50),
    paddingTop: 0,
    paddingBottom: 0
  }));


  // Create X-Axis
  let xAxis = chart.xAxes.push(
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
  
  // create renderer for yAxis
  var yRendererT = am5xy.AxisRendererY.new(root, {
    opposite: false   //Axis will be placed on the left side of the chart (opposite: true to display on right side)
  });

  // create Y-Axis
  // for multiple measurands you can create more than one Y-Axis
  // every Axis needs its own renderer
  var yAxisT = chart.yAxes.push(
    am5xy.ValueAxis.new(root, {
      maxDeviation: 1,
      renderer: yRendererT,
      // comment out the next two lines if you rather have variable axis ranges
      //min: 0,
      //max: 100
    })
  );


  // yAxis.children.unshift() creates the label as first element (optional)
  // yAxis.children.push() creates the label as the last element (optional)
  // in case of a second measurand the label needs to be last element because the axis is on the right side of the graph
  yAxisT.children.unshift(
    am5.Label.new(root, {
      rotation: -90,
      text: "Temperature",
      y: am5.p50,
      centerX: am5.p50
    })
  );


  // global variable tempSeries is initialized as a series for the chart
  // a series is the graph displayed in the chart. It is connected to an X- and a Y-Axis
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

  // set parameter styles
  tempSeries.strokes.template.setAll({ strokeWidth: 2 });
  yRendererT.grid.template.set("strokeOpacity", 0.1);
  yRendererT.labels.template.set("fill", tempSeries.get("fill"));
  yRendererT.setAll({
    stroke: tempSeries.get("fill"),
    strokeOpacity: 1,
    opacity: 1
  });

  // Set up data processor to parse string dates
  tempSeries.data.processor = am5.DataProcessor.new(root, {
    dateFields: ["date"]
  });

  // set color of series
  tempSeries.set("stroke", "red");
  tempSeries.set("fill", "red");


  // pace the current data to the series
  tempSeries.data.setAll(correctTempValues);

  // create a legend with specific parameters (optional)
  let legend = chart.children.push(am5.Legend.new(root, {
    nameField: "name",
    fillField: "color",
    strokeField: "color",
    centerX: am5.percent(50),
    x: am5.percent(50)
  }));

  // push an object to the legend
  legend.data.setAll([{
    name: "Temperature",
    color: "red"
  }
  ]);

  // Add cursor (optional)
  var cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
    xAxis: xAxis,
    behavior: "none"
  }));
  cursor.lineY.set("visible", false);

  // add scrollbar (optional)
  var scrollbarX = am5xy.XYChartScrollbar.new(root, {
    orientation: "horizontal",
    height: 10
  });

  // assign it and place it on the charts bottom
  chart.set("scrollbarX", scrollbarX);
  chart.bottomAxesContainer.children.push(scrollbarX);

  // creating an export option (optional)
  var exporting = am5plugins_exporting.Exporting.new(root, {
    menu: am5plugins_exporting.ExportingMenu.new(root, {}),
    filePrefix: filename,
    dataSource: exportData,
    dateFields: ["date"],
    dateFormat: "HH:mm:ss",
    // definition of exportsettings for different file formats
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
// It is called in the function dataProcessing() whenever a new value is added to the array
function liveData(measurementValue) {
  let size = measurementValue.length;
  let newestValue = measurementValue[size - 1];

  tempSeries.data.push(newestValue);

}



