/*Webserial Terminal 
Sebastian Braun

ModbusRTU-Module-Version of Webserial Terminal - 1.3 Measurement Series

whats new?

- sending a fixed (getTemperature) command as a series of measurements
- settings menu with inputs for measurement period, measurement time and manual stop option
- control of chanel traffic with 'busyCounter' and 'chanelBusy'
- alert notifications for wrong entries
- more complex html manipulations
    - replacing divs
    - changing colors and content of buttons
    - hiding elements when they shouldnt be used


New features of this version are marked with comments explaining the commands.
Pleae note that there are many changes aswell in the corresponding html file.
There are no comments since these are rather self explanatory.

  
In this version only temperature commands are sent to keep the code clear.
Different measurands can easlily be added by more html inputs in the settings div, variables to store the settings and a couple if branches in the startMeasurement function
Note that received arrays containing humidity values need to be treated slightly different in the dataProcessing() function since they cant contain negative numbers.
For implementation of more versatile measurement settings look at the code of the complete Modbus-Webterminal Version.


            
*/

/**************GLOBAL vARIABLES*********************************************************************************/

let scrollIntervalId;
// intervallID fpr temperature measurement
let getTempIntervalId;
// intervallID for timer function that checks if chanelBusy has been true for to long 
// (chanel can be opened to new transmission if there has been no response)
let busyCounterIntervalId = 0;

let port;
let reader;
let writer;


let connected = false;
let debug = false;
let autoScroll = false;
let chanelBusy = false;
//counter if chanel is busy for to long (some error)
let busyCounter = 0;

const getTemperature = new Uint8Array([1, 3, 0, 0, 0, 1, 132, 10]);
let readValueArray = [];
// variable for the measured values 
let correctTempValues = [];

// variables that store the settings for a measurement series
let measurementPeriod = 0;
let measurementTime = 0;
let manualStop = false;

// series of measurement running
let runningMeasurement = false;
// counter to differentiate between temp and hum measurement and to count number of saved values
let measurementCounter;


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
    autoscroll();
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
              // Interval funtion IncrementBusyCounter() is started in writeToPort() when transmission is started
              // if there is no response the function (which counts up everytime it is called) will set chanelBusy false eventually
              // this way the chanel is open again after a while even if there is no response (error/ wron message)
              // here we have received a response so we can clear the interval function and set the Interval ID to 0
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
      // in case there is a measurement running when the port is closed we stop the measurement
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
  // here we create a date variable that stores the exact time (when declared)
  let date = new Date();
  // we make a new object entry in the array in json format using the date variable and the processed received temperature value
  // this array is used in a later version to visualize thg data in a chart
  correctTempValues.push({ date: date, value: newValue });
  // display the temperature value in the terminal
  document.getElementById("terminal").innerHTML += "<br>Temperature:&nbsp;&nbsp;  ";
  document.getElementById("terminal").innerHTML += newValue;
  document.getElementById("terminal").innerHTML += " °C";
  if (debug) {
    document.getElementById("terminal").innerHTML += "<br><br>Receiving Process done";
  }
  measurementCounter ++;
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
    // the busy counter is set to 0 before starting the interval function that increments the counter everytime it is called
    busyCounter = 0;
    if (busyCounterIntervalId == 0) {
      // the interval function is called every 100 milliseconds
      busyCounterIntervalId = setInterval(incrementBusyCounter, 100);
    }
  }
  else {
    document.getElementById("terminal").innerHTML += "<br>Chanel is busy, Telegram not transmitted!<br><br>";

  }
}

// this function is called as an intervall function and is used to change the state of chaneklBusy after a certain time
function incrementBusyCounter() {
  busyCounter++;
  // when the counter has reached almost the current measurment period (transmission period for temperature commands)
  // it sets cnanelBusy = false
  // the measurement period is at least 1 second wich is more than enough time to expect an answer to a previous command
  // this way the chanel will be free for the next command in time in every case without having the risk of two commands or answers interferring with one another
  if (busyCounter == ((measurementPeriod * 10) - 1)) {
    chanelBusy = false;
    busyCounter = 0;
    if (debug) {
      document.getElementById("terminal").innerHTML += "<br><h4>ChanelBusy has been set = false due to timeout!</h4>";

    }
  }
}


/**************************************Functions for Diesplay & Terminal settings*************************************************************************** */

// this function replaces the html elements of the terminal container with the elements of the settings
// when the button 'serial measurements' is pressed
function showSettings() {
  if (!runningMeasurement) {
    //replace terminal with settings console
    document.getElementById("display").innerHTML = document.getElementById("settings").innerHTML;
    // hide buttons on side bar that are irrelevant now
    document.getElementById("startMeasurement").style.display = "none";
    document.getElementById("measurement").style.display = "none";
    document.getElementById("safeSettings").style.display = "block";
    document.getElementById("safeSettings").style.backgroundColor = "green";
    manualStop = false;
  }
}

// this function stores the values of the settings in global variables
// when the button 'safe' is pressed
// it displays the safed settings on the webpages terminal
function safeSettings() {
  // assigning measurementPeriod and measurementTime
  measurementPeriod = document.getElementById("period").value;
  measurementTime = document.getElementById("measurementTime").value;
  // check if measurement will be stopped manually
  if (document.getElementById("manualStop").checked) {
    manualStop = true;
  }
  else {
    manualStop = false;
  }
  // error warnings
  if (measurementPeriod < 1) {
    window.alert("The measurment frequency is to fast foer the selected measurands. For further limitations click the info button");
  }
  else if (manualStop == false && measurementTime == 0) {
    window.alert("Please chose a Measurement Time or select the manual stop option.");
  }
  // inputs are correct
  else {
    if (debug) {
      document.getElementById("terminal").style.fontSize = "1vw";
    }
    // show new buttons and change content, go back to terminal
    document.getElementById("safeSettings").style.display = "none";
    document.getElementById("safeSettings").style.backgroundColor = "white";
    document.getElementById("startMeasurement").innerHTML = "Start";
    document.getElementById("startMeasurement").style.display = "block";
    document.getElementById("startMeasurement").style.backgroundColor = "green";
    document.getElementById("measurement").style.display = "block";
    document.getElementById("display").innerHTML = '<div id="terminal" class="containerTerminal"></div>';
    // display measurment parameters
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

// this function starts the serial measurements with the global variables with the safed values from settings
// depending on the measurands interval functions are called in a specific frequency for a certain time before they are stopped
async function startMeasurements() {
  if (connected) {
    //check if there is already a measurment running
    // if not so
    if (runningMeasurement == false) {
      //clear terminal content
      document.getElementById("terminal").innerHTML = "";
      // set measurment interval depending on the measurmentPeriod setting
      getTempIntervalId = setInterval(() => { writeToPort(getTemperature); }, measurementPeriod * 1000);
      // if settings are valid
      measurementCounter = 0;       // initialize measurement counter
      runningMeasurement = true;    // set running measurement variable true
      document.getElementById("measurement").style.display = "none";    //hide measurment-settings button
      // checking wether measurement is stopped manually
      if (manualStop == false) {
        // timeout functions considering the measurmentTime Variables setted
        setTimeout(() => {
          clearInterval(getTempIntervalId)}, measurementTime * 1000);
        // call the measurementFinished() function right after the Intervall function has stopped
        setTimeout(measurementFinished, measurementTime * 1000 + 1000);
        document.getElementById("startMeasurement").style.display = "none";
      }
      // if measurement is stopped manually
      else {
        document.getElementById("startMeasurement").style.display = "block";
        document.getElementById("startMeasurement").innerHTML = "Stop";
        document.getElementById("startMeasurement").style.backgroundColor = "red";
      }

    }
    // stop button (red) is pressed
    else {
      // interval functions are stopped
      clearInterval(getTempIntervalId);
      await setTimeout(1000);
      // display measurement results
      document.getElementById("terminal").innerHTML += "<br><br>Measurement Done!";
      document.getElementById("terminal").innerHTML += "<br>Total number of saved values:";
      document.getElementById("terminal").innerHTML += measurementCounter;
      document.getElementById("terminal").innerHTML += "<br><br>";
      // set variable false
      runningMeasurement = false;
      // change html elements visibility and content
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

