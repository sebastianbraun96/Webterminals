# Webterminals
This is a collection of different versions of webterminals for Modbus-RTU and ASCII communication.

Please note that the scripts are programmed for the communication with (temperature- and humidity-) sensors with a specific firmware.
Open communication with manual input for Modbus or ASCII commands (at least in the complete versions) is possible as well, though most functionalities are only accessible with the corresponding firmware on the end device.

The main purpose of the Webterminal is the performance of measurement series with mentioned temperature and humidity sensors.
This is possible with ASCII communication (Version: Webterminal_ASCII) or Modbus communication (Version Webterminal_Modbus_RTU).
The main difference between these two versions is the format in which the telegrams are communicated. 

Modbus-Version:
- Multiple settings for connections such as Baudrate, databits, stop bits, and parity mode.
- 3 ways of communication
    1. Single measurement (via one of the two buttons)
    2. Multimeasurement (via Measurement Series Button) with multiple settings
        - up to 5 connected sensors
        - live updated data in chart (of all sensors in individual charts or combined charts)
        - manual stop or specific measurement time
        - adjustable measurment frequency 
        - two measurands at the same time
        - data export in diferent file formats
    3. Modbus Config Mode (viaModbus setings) that allows individual built telegrams with different function codes
- Additional features for the terminal 
  - autoscroll
  - very detailed debug mode
- Chart settings
  - adding and removing a scrollbar
  - fixing axes to a certain value
  - combining and separating graphs in different charts
  - all while running measurements

ASCII-Verion (ASCII-Verion):
 Multiple settings for connections such as Baudrate, databits, stop bits, and parity mode.
- 3 ways of communication
    1. Single measurement (via one of the two buttons)
    2. Multimeasurement (via Measurement Series Button) with multiple settings
        - up to 5 connected sensors
        - live updated data in chart (of all sensors in individual charts or combined charts)
        - manual stop or specific measurement time
        - adjustable measurment frequency 
        - two measurands at the same time
        - data export in diferent file formats
    3. manual Inputfield for direct ASCII-Communication to the connected device 
- Additional features for the terminal 
  - autoscroll
  - very detailed debug mode
- Chart settings
  - adding and removing a scrollbar
  - fixing axes to a certain value
  - all while running measurements


Additional versions with smaller and less complex code samples can be accessed as well in order to better understand functionalities used in the two versions above.
These versions are fully functionable and work like smaller modules with specific features. 
All scripts build up on one another so it is best to start with the first one and work through all of them. New features have specific comments so its easy to see what is new compared to the previous version

Below you'll find a short description of each version and what it is about


Handling of Webserial API (WebterminalI_1.1_Port_Interaction):
- create a port object and show accessible ports
- open an port
- close the port
- test button



Single Measurement (WebterminalI_1.2_Modbus_Single_Measurements):
- send a fixed command via a button
- receive a temperature value
- step by step data conversion
- autoscroll function
- debug mode



Measurement Series (WebterminalI_1.3_Modbus_Measurement_Series):
- set up interval functions for transmission of data (in correct time periods)
- processing received data
  	- interpretation/ conversion
  	- storage
- controlling data traffic with error handling 



variable transmition data & CRC check (WebterminalI_1.4_Modbus_ConfigMode_CRC_Check):
- manual composition of a mobus telegram
- generation of crc checksum for transmition
- verification of received crc checksum



Data visualization with amCharts5 (WebterminalI_1.5_Data_visualization):
- chart elements and structure
- live data update
- data export



