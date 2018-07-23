#!/usr/bin/env python
import sys
import serial
import time

minitel = serial.Serial('/dev/ttyUSB0', baudrate=1200, bytesize=7, parity='E', stopbits=1, timeout=None, xonxoff=0, rtscts=0)
#minitel = serial.Serial('/dev/ttyUSB0', baudrate=9600, bytesize=8, parity='N', stopbits=1, timeout=None, xonxoff=0, rtscts=0)
#minitel = serial.Serial('/dev/ttyUSB0', baudrate=9600, bytesize=7, parity='E', stopbits=1, timeout=None, xonxoff=0, rtscts=0)

nomFichier=sys.argv[1]
for nomFichier in sys.argv:
  if nomFichier == sys.argv[0]: continue
  stream = open(nomFichier, 'rb').read()

  for byte in stream:
    minitel.write(byte)

minitel.close()

