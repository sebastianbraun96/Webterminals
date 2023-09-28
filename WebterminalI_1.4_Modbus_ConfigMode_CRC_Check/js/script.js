/*Webserial Terminal 
Sebastian Braun

ModbusRTU-Module-Version of Webserial Terminal - 1.4 CRC check and variable transmition data

whats new?

- composition of a mobus telegram with a configuration mode
- generation of crc checksum for transmition
- verification of received crc checksum



New features of this version are marked with comments explaining the commands.
Pleae note that there are many changes aswell in the corresponding html file.
There are no comments since these are rather self explanatory.

  



            
*/

/**************GLOBAL vARIABLES*********************************************************************************/

let scrollIntervalId;

let port;
let reader;
let writer;


let connected = false;
let debug = false;
let autoScroll = false;
let chanelBusy = false;
// Interval ID for timeout-function in case a non valid message has been sent
let timeoutIntervalId;

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
    document.getElementById("connect").innerHTML = "Disconnect";
    document.getElementById("getTemp").style.backgroundColor = "white";
    document.getElementById("terminal").innerHTML += "<br>disconnected!";
    connected = false;
  }
}

/***************************************Functions for Processing Data********************************************************************** */


function dataProcessing(array) {
  if (debug) {
    document.getElementById("terminal").innerHTML += "<br><br><h2>Receiving Process:</h2>";
    document.getElementById("terminal").innerHTML += "this is the assembled int8Array: ";
    document.getElementById("terminal").innerHTML += readValueArray;
    document.getElementById("terminal").innerHTML += "<h4>CRC Error check:</h4>";
  }
  //the received data (length = 7) is stripped off its crc checksum
  let rawData = new Uint8Array([array[0], array[1], array[2], array[3], array[4]])
  // the shorted array is passed to the crc_generator() funktion to calculate the correct crc checksum
  let controlData = new Uint8Array([]);
  // the function crc_generator() is called and the return value is stored in controlData
  controlData = crc_generator(rawData);
  // since the variales array and controlData are of different data types the crc bytes of both of them 
  //are stored in int variables in order to compare them in the next step
  let crcReceived1 = parseInt(array.slice(array.length - 2, array.length - 1));
  let crcReceived2 = parseInt(array.slice(array.length - 1));
  let crcGenerated1 = parseInt(controlData.slice(controlData.length - 2, controlData.length - 1));
  let crcGenerated2 = parseInt(controlData.slice(controlData.length - 1));


  if (debug) {
    document.getElementById("terminal").innerHTML += "<br>without the CRC checksum: ";
    document.getElementById("terminal").innerHTML += rawData;
    document.getElementById("terminal").innerHTML += "<br>passed CRC (intValues): ";
    document.getElementById("terminal").innerHTML += crcReceived1;
    document.getElementById("terminal").innerHTML += ",";
    document.getElementById("terminal").innerHTML += crcReceived2;
    document.getElementById("terminal").innerHTML += "<br>generated CRC (intValues): ";
    document.getElementById("terminal").innerHTML += crcGenerated1;
    document.getElementById("terminal").innerHTML += ",";
    document.getElementById("terminal").innerHTML += crcGenerated2;
    document.getElementById("terminal").innerHTML += "<br><br>";
    document.getElementById("terminal").innerHTML += "<br>this is the received array with recalculated CRC checksum: ";
    document.getElementById("terminal").innerHTML += controlData;
  }
  // if the passed crc and the calculated crc are identical the data can be processed
  if ((crcReceived1 == crcGenerated1) && (crcReceived2 == crcGenerated2)) {
    let dataBytes = array.slice(3, 5);
    let hexString = Array.from(dataBytes).map((i) => i.toString(16).padStart(2, '0')).join('');
    let decimal = parseInt(hexString, 16);
    let float = parseFloat(decimal);
    let newValue = float / 100 - 100;
    newValue = parseFloat(newValue.toFixed(2))
    if (debug) {
      document.getElementById("terminal").innerHTML += "<br>sliced two Data-Bytes: ";
      document.getElementById("terminal").innerHTML += dataBytes;
      document.getElementById("terminal").innerHTML += " (the Bytes are swapped and then converted to hex)";
      document.getElementById("terminal").innerHTML += "<br>hex value: ";
      document.getElementById("terminal").innerHTML += hexString;
      document.getElementById("terminal").innerHTML += "<br>Decimal number: ";
      document.getElementById("terminal").innerHTML += decimal;
      document.getElementById("terminal").innerHTML += "<br>";
    }

    document.getElementById("terminal").innerHTML += "<br>Temperature:&nbsp;&nbsp;  ";
    document.getElementById("terminal").innerHTML += newValue;
    document.getElementById("terminal").innerHTML += " °C";
    if (debug) {
      document.getElementById("terminal").innerHTML += "<br><br>Receiving Process done";
    }
  }
  chanelBusy = false;
  clearInterval(timeoutIntervalId);
  readValueArray.length = 0;
}


/***************************************Functions for Transmitting Data********************************************************************** */

// this function calculates the crc summ for a given Array
// the passed array contains the adress byte, command byte, 16bits for the start adres, 16bit for the number of registers to read
// there is a total number of 6 Bytes
// the return variable is the passed array with the two new CRC Bytes attached
function crc_generator(array) {
  let crc = 0xFFFF;
  // go through each byte
  for (let i = 0; i < array.length; i++) {
    crc ^= array[i] & 0xFF; //XOR byte into least sig. byte of crc
    // go through each bit
    for (let i = 0; i < 8; i++) {
      let carry = crc & 0x0001;
      crc >>= 1;
      if (carry) crc ^= 0xA001;
    }
  }
  let hex = crc.toString(16);  // conversion to a hexstring
  //adding a leading 0 if hexstring has only 3 characters
  if (hex.length == 3) {
    let zero = "0";
    hex = zero.concat(hex);
  }
  // swap bytes of hexstring (to BigEndian)
  let hexByteSwapped = hex.slice(2) + hex.slice(0, 2);
  let crc_Bytes = new Uint8Array([]);
  // convert first hex-Byte to Integer and save in Array
  crc_Bytes = ([parseInt(hexByteSwapped.slice(0, 2), 16), parseInt(hexByteSwapped.slice(2), 16)]);
  // when this function is called in writeToPort() the passed array has 6 elements
  let fullTelegram6 = new Uint8Array([array[0], array[1], array[2], array[3], array[4], array[5], crc_Bytes[0], crc_Bytes[1]]);
  // when this function is called in dataProcessing() the passed array has 5 elements
  let fullTelegram5 = new Uint8Array([array[0], array[1], array[2], array[3], array[4], crc_Bytes[0], crc_Bytes[1]]);

  if (debug) {
    document.getElementById("terminal").innerHTML += "<br>CRC dec: ";
    document.getElementById("terminal").innerHTML += crc;
    document.getElementById("terminal").innerHTML += "<br>CRC hex: ";
    document.getElementById("terminal").innerHTML += hex;
    document.getElementById("terminal").innerHTML += "<br>swapped hex: ";
    document.getElementById("terminal").innerHTML += hexByteSwapped;
    document.getElementById("terminal").innerHTML += "<br>CRC Bytes: ";
    document.getElementById("terminal").innerHTML += crc_Bytes;
    document.getElementById("terminal").innerHTML += "<br>";
  }
  if (array.length == 5) {
    return fullTelegram5;
  }
  else if (array.length == 6) {
    return fullTelegram6;
  }
}



async function writeToPort(data) {
  if (debug) {
    document.getElementById("terminal").innerHTML += "<br><h2>Transmission Process<h2/>";
    document.getElementById("terminal").innerHTML += "<h4>CRC generation:</h4>";

  }
  let telegram = crc_generator(data);
  if (debug) {
    document.getElementById("terminal").innerHTML += "<h4>Data composition:</h4>";
    document.getElementById("terminal").innerHTML += "raw Data: ";
    document.getElementById("terminal").innerHTML += data;
    document.getElementById("terminal").innerHTML += "<br>...including crc Bytes to full telegram: ";
    document.getElementById("terminal").innerHTML += telegram;
    document.getElementById("terminal").innerHTML += "<br><br>";
  }
  if (!chanelBusy) {
    writer = port.writable.getWriter();
    await writer.write(telegram);
    if (debug) {
      document.getElementById("terminal").innerHTML += "<br>Chanel is free, message can be sent";
      document.getElementById("terminal").innerHTML += "<br>Message send successfully! ";
      document.getElementById("terminal").innerHTML += "<br>Transmission process done";
      document.getElementById("terminal").innerHTML += "<br><br>";
    }
    writer.releaseLock();

    chanelBusy = true;
    timeoutIntervalId = setInterval(timeout, 3000);
    readValueArray.length = 0;
  }
  else {
    document.getElementById("terminal").innerHTML += "<br>Chanel is busy, Telegram not transmitted!<br><br>";

  }
}

function timeout() {
  chanelBusy = false;
}


/**************************************Functions for Diesplay & Terminal settings*************************************************************************** */


function showSettings() {
  //replace terminal with settings console
  document.getElementById("display").innerHTML = document.getElementById("modbusConfigDiv").innerHTML;
  // hide buttons on side bar that are irrelevant now
  document.getElementById("modbusCommand").style.display = "none";
  document.getElementById("debugButton").style.display = "none";

}

// this button stores the inputs in a Uint8Array wich is pased to the writeToPort() function
function sendManualModbus() {
  if (connected) {
   
    let modbusTelegram = new Uint8Array([
      document.getElementById("address").value,
      document.getElementById("functionCode").value,
      document.getElementById("thirdByte").value,
      document.getElementById("fourthByte").value,
      document.getElementById("fifthByte").value,
      document.getElementById("sixthByte").value
    ]);
    
    document.getElementById("display").innerHTML = '<div id="terminal" class="containerTerminal"></div>';
    document.getElementById("terminal").innerHTML = "";
    writeToPort(modbusTelegram);
    modbusTelegram.length = 0;
    if (debug) {
      document.getElementById("terminal").style.fontSize = "1vw";
      document.getElementById("terminal").innerHTML = modbusTelegram;
    }
    
    // show new buttons and change content, go back to terminal
    document.getElementById("modbusCommand").style.display = "block";
    document.getElementById("debugButton").style.display = "block";
  }
  else {
    window.alert("Connect to COM Port first.");
  }

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

