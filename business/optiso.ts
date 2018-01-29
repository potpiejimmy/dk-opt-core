import { packer } from 'jspos';
 
let { IFB_NUMERIC, IFB_BITMAP, IFB_LLNUM, IFB_LLLNUM, IF_CHAR, IFB_LLCHAR, IFB_LLLCHAR, IFB_BINARY, IFB_LLBINARY, IFB_LLLBINARY, IFB_AMOUNT } = packer;

export let OPT_ISO_MSG_FORMAT = [
    /*MTI*/            new IFB_NUMERIC(4, "Message Type Indicator", true),
    /*PRIMARY BITMAP*/ new IFB_BITMAP(8, "Bitmap"),
];

/* define OPT bitmaps */
OPT_ISO_MSG_FORMAT[3]  = new IFB_BINARY(3, "Abwicklungskennzeichen");
OPT_ISO_MSG_FORMAT[11] = new IFB_BINARY(3, "Tracenummer");
OPT_ISO_MSG_FORMAT[12] = new IFB_BINARY(3, "Uhrzeit");
OPT_ISO_MSG_FORMAT[13] = new IFB_BINARY(2, "Datum");
OPT_ISO_MSG_FORMAT[33] = new IFB_BINARY(5, "ID zwischengeschalteter Rechner / PS-ID");
OPT_ISO_MSG_FORMAT[41] = new IFB_BINARY(4, "Terminal-ID");
OPT_ISO_MSG_FORMAT[42] = new IFB_BINARY(8, "Betreiber-BLZ");
OPT_ISO_MSG_FORMAT[53] = new IFB_BINARY(8, "Sicherheitsverfahren");
OPT_ISO_MSG_FORMAT[57] = new IFB_BINARY(37, "Verschlüsselungsparameter");
OPT_ISO_MSG_FORMAT[61] = new IFB_BINARY(10, "Online-Zeitpunkt");
OPT_ISO_MSG_FORMAT[62] = new IFB_BINARY(19, "Daten");
OPT_ISO_MSG_FORMAT[64] = new IFB_BINARY(8, "MAC");
