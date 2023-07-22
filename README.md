# Webterminals
This is a collection of different versions of webterminals fpr Modbus and ASCII communication.

Please note that the Scripts are programmed for the communication to (temperature- and humidity-) sensors with a specific firmware.
Open communication with manual input for Modbus or ASCII commands (depending on the version) is possible as well, though most functionalities are only accessible with the corresponding firmware on the end device.

The main purpose of the Webterminal measurement series with mentioned temperature and humidity sensors.
This is possible with ASCII communication (Version XYXYXY) or Modbus communication (Version XYXYYXY).

Modbus-Version (Modbus-Version):
- Multiple settings for connections such as Baudrate, databits, stop bits, and parity mode.
- 3 ways of communication
    1. Single measurement (via one of the two buttons)
    2. multimeasurement (via Measurement Series Button) with multiple settings
        up to 5 connected sensors
        live updated data in chart (of all sensors in individual charts or combined charts)
        manual stop or specific measurement time
        adjustable measurment frequency (up to 1 Hz)
        two measurands at the same time
        data export in diferent file formats
    3. Modbus Config Mode (viaModbus setings) that allows individual built telegrams with different function codes
- Several additional features for the terminal 
  autoscroll
  very detailed debug mode
- Chart settings
  adding and removing a scrollbar
  fixing axes to a certain value 
  all while running measurements

ASCII-Verion (ASCII-Verion):


Additional versions with smaller and less complex code samples can be accessed as well in order to comprehend functionalities used in the two versions above a bit better.
These versions are fully functionable and work like smaller modules with specific features. 
All scripts build up on one another so it is best to stat with the first one and work through all of them.

Below you'll find a short description of each version and what it is about

Handling of Webserial API ():
- creatin a port obkect and show accessible ports
- open an port
- send and receive data
- closing the port


Single Measurement ():
(fixed telegram)
- sending a fixed command via a button
- receiving a temperature value
- step by step data conversion

Measurement Series ():
(fixed telegram)
- setting up intervall functions for transmition data (in correct time periods)
- processing received data
  	- interpretation/ conversion
  	- storage
- controlling data traffic with error handling 


Data visualization with amCharts5 ():
- chart elements and structure
- multiple series in one chart
- live data update
- live chart manipulation
- data export

cariable transmition data & CRC check ():
- composition of a mobus telegram
- generation of crc checksum for transmition
- verification of received crc checksum


