/*Webserial Terminal 
Sebastian Braun

ModbusRTU-Module-Version of Webserial Terminal - 1.1 Port Interaction with the Webserial API

whats new?

- opening and closing a port using the Webserial API of chrome
- using a global variable to keep track of connection state
- test button to check if connection is open



            
*/

/**************GLOBAL vARIABLES*********************************************************************************/
// Port Objekt
let port;
// reader object from port to read serial data
let reader;
// writer object from port to write serial data
let writer;
// Port connected?
let connected = false;


/******************************************************************************************************************************************* */


// when opening the webpage this checks automatically if the serial api is supported in the used browser
if ("serial" in navigator) {
  document.getElementById("terminal").innerHTML += "The Web Serial API is supportet!<br>";
}
else {
  document.getElementById("terminal").innerHTML += "The Web Serial API is not supportet!<br>";
}


// this function creates a port object and allows a connection to a connected serial device 
// when there is readable data available it will can be processed inside this function
async function connectComPort() {
  if (connected == false) {
    // navigator.serial.requestPort() Prompts the user to select any serial port. returns a SerialPort object. 
    // the term await stops the next codeline from beeing excecuted until the preveous one is completed
    port = await navigator.serial.requestPort();

    // the value from the input html elements is stored in local variables
    let baudrate = document.getElementById("baudrate").value;
    let dataBits = document.getElementById("data").value;
    let stopBits = document.getElementById("stop").value;
    let parity = document.getElementById("parity").value;

    // Wait for the serial port to open. with selected parameters
    await port.open({ baudRate: baudrate, dataBits: dataBits, stopBits: stopBits, parity: parity });

    // the text of the button is changed to disconnect
    document.getElementById("connect").innerHTML = "Disconnect";

    // the global variable is changed to true. This keeps track of the state of the connection
    // its value is checked when the connect button is pressed
    connected = true;

    // inside the following loop communication to and from the port is possible
    while (port.readable) {
      // creates reader and locks readable to it
      reader = port.readable.getReader();
      try {
        while (true) {
          // await reader.read() returns two properties (value and done)
          // if done is true, the serial port has been closed or the connection has failed
          // value is an Uint8Array --> datatype is important for processing the data later on
          const { value, done } = await reader.read();
          if (done) {
            // Allow the serial port to be closed later. readable isnt locked any longer
            reader.releaseLock();
            break;
          }
          // if there is data available it can be processed in this if branch
          if (value) {
           // nothing is send yet (in this version) so there will be nothing received
          }
        }
      }
      catch (error) {
        // Handle non-fatal read error.
      }
    }
    // port is closed when the connection is stopped
    await port.close();
    document.getElementById("connect").innerHTML = "Connect";
    connected = false;
  }
  // port is closed when the button "disconnect" is pressed
  else {
    reader.releaseLock();
    await port.close();
    document.getElementById("connect").innerHTML = "Connect";

    connected = false;
  }
}



// test button to check if connection to port is successful
function testconnection() {
  if(connected == true){
    document.getElementById("terminal").innerHTML += "<br>active connection to port!";
  }
  else {
    document.getElementById("terminal").innerHTML += "<br>no connection to port!";
  }
}