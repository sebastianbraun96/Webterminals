/*Webserial Terminal 
Sebastian Braun

ModbusRTU-Module-Version of Webserial Terminal - 2.2 Single Measurments

whats new?

- sending a fixed (getTemperature) command via a button and a transmission function writeToPort()
- function dataProcessing() for step by step processing of received data
- debug mode for comprehension of data conversions
- manipulation functions for the terminal
    - clearTerminal() function
    - autoscroll() function 


New features of this version are marked with comments explaining the commands.
Pleae note that there are many changes aswell in the corresponding html file.
There are no comments since these are rather self explanatory.
            
*/

/**************GLOBAL vARIABLES*********************************************************************************/

// IntervalId of function that is called in a specific frequency
let scrollIntervalId;
let port;
let reader;
let writer;


let connected = false;

// this boolean variable indicates if the debug mode is currently active 
// it can be changed with a button on the webpage
let debug = false;
// this boolean variable indicates if autoscroll is currently active 
// it can be changed with a button on the webpage
let autoScroll = false;
// variabel that indicates if there is an activ communication process between browser and device 
let chanelBusy = false;



// Variables for measurements
// Commands for Sensor Firmware to receive temperature and humidity value
const getTemperature = new Uint8Array([1, 3, 0, 0, 0, 1, 132, 10]);
// variable for received Bytes before processing
let readValueArray = [];





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
    document.getElementById("getTemp").style.backgroundColor = "green";
    while (port.readable) {
      reader = port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            reader.releaseLock();
            break;
          }
          // the data arrives in chuncs of Uint8 stored in the array value
          if (value) {
            // additional information is printed if the debug mode is avtive
            if (debug) {
              document.getElementById("terminal").innerHTML += "<br>this is a raw received int8Array: ";
              document.getElementById("terminal").innerHTML += value;
            }
            // since value doesn't always store the complete message it is filled in the Array readValueArray
            let length = readValueArray.length;
            for (let i = 0; i < value.length; i++) {
              readValueArray[length + i] = value[i];

            }
            // when the length of the array readValueArray has reached 7 we can assume that the message is complete
            // the command we send in this version always produces an answer with the length of 7 Bytes
            if (readValueArray.length == 7) {
              // we call this function to process the received message
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
    reader.releaseLock();
    await port.close();
    document.getElementById("connect").innerHTML = "Connect";
    document.getElementById("baudrate").value = "";
    document.getElementById("getTemp").style.backgroundColor = "white";
    connected = false;
  }
}

/***************************************Functions for Processing Data********************************************************************** */


// this function processes the received data by converting the dataBits to a float value, 
// wich is then displayed in the terminal
function dataProcessing(array) {
  if (debug) {
    document.getElementById("terminal").innerHTML += "<br><br><h2>Receiving Process:</h2>";
    document.getElementById("terminal").innerHTML += "this is the assembled int8Array: ";
    document.getElementById("terminal").innerHTML += readValueArray;
  }
  // first we cut out the two bytes containing the data
  let dataBytes = array.slice(3, 5);
  // converting Uint8 to hex String
  let hexString = Array.from(dataBytes).map((i) => i.toString(16).padStart(2, '0')).join('');
  // converting hexString to decimal
  let decimal = parseInt(hexString, 16);
  // converting decimal to float
  let float = parseFloat(decimal);
  // the temperature data has changed dimensions before sent from the sensor
  // this is done to avoid negative integers and float values
  // calculating back the temperature out of float value
  newValue = float / 100 - 100;
  // fix value to two decimals (returns a string so it has to be parsed to float again)
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
  // display the temperature value in the terminal
  document.getElementById("terminal").innerHTML += "<br>Temperature:&nbsp;&nbsp;  ";
  document.getElementById("terminal").innerHTML += newValue;
  document.getElementById("terminal").innerHTML += " °C";
  if (debug) {
    document.getElementById("terminal").innerHTML += "<br><br>Receiving Process done";
  }
  // the global variable chanelBusy is st to false
  // so a new message can be sent with the writeToPort function
  chanelBusy = false;
  // the array is cleared for the next message
  readValueArray.length = 0;
}


/***************************************Functions for Transmitting Data********************************************************************** */


// a simple function that writes the passed argument to the connected port
// the variable has to be a uint8Array!
// in this version the function is called when the button getTemperature on the webpage is pressed
// you can see the call in the html file of this folder
async function writeToPort(data) {
  // the variable chanelBusy must be false in order to send a message
  if (!chanelBusy) {
    // a writer object is created (siilar to the reader object in connectComPort()
    writer = port.writable.getWriter();
    // the passed array is sent to the connected port using the APIs command
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
    // writer object is released
    writer.releaseLock();
    // global variable is set true - no other transmition is possible until the responce is received and processed
    // you can check this by pressing the getTemperature button really fast (before a responce is printed)
    chanelBusy = true;
  }
  else {
    document.getElementById("terminal").innerHTML += "<br>Chanel is busy, Telegram not transmitted!<br><br>";

  }
}




/**************************************Functions for Diesplay & Terminal settings*************************************************************************** */

// this function clears the content of the webpages terminal
function clearTerminal() {
  document.getElementById("terminal").innerHTML = "";

}

// this function calles the autoscroll function when the corrsponding button is pressed
function autoscroll() {
  // the global variable autoscroll keeps track of the state of the function
  if (!autoScroll) {
    // intervall functions are used to call functions in specific time intervalls
    // the functions are called in the background until stopped by a clearInterval() command
    // when called, the intevall-function returns an interval ID wich has to be pased to the clearIntervall command later
    scrollIntervalId = setInterval(scrolling, 1000 / 5);
    document.getElementById("autoscroll").innerHTML = "Disable Autoscroll";
    autoScroll = true;
  }
  else if (autoScroll) {
    // when "disable autoscroll" is pressed the interval-function is cleared
    clearInterval(scrollIntervalId);
    document.getElementById("autoscroll").innerHTML = "Enable Autoscroll";
    autoScroll = false
  }
}

// this function enables autoscroll when there is an overflow in the y-axis of the terminal
function scrolling() {
  let scrollBox = document.getElementById("terminal");
  if (scrollBox.scrollTop < (scrollBox.scrollHeight - scrollBox.offsetHeight)) {
    scrollBox.scrollTop = scrollBox.scrollHeight;
  }
}


// this function activates or deactivates the debug mode when the corrsponding button is pressed
function enableDebug() {
  if (debug == false) {
    document.getElementById("debugButton").innerHTML = "Disable Debug";
    // font-size in the terminal is reduced to fit more text on the screen
    document.getElementById("terminal").style.fontSize = "1vw";
    debug = true;
  }
  else if (debug == true) {
    document.getElementById("debugButton").innerHTML = "Enable Debug";
    document.getElementById("terminal").style.fontSize = "1.5vw";

    debug = false;
  }
}

