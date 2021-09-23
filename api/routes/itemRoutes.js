import express from "express"

import Logger from "../../Logger.js"

import Item from "../models/Item.js"
// import User from "../models/User.js"

const itemsRouter = express.Router();

// get items by location // maybe add authentication by userId later, so hackers cannot find the address of a user, but for now it should be fine
itemsRouter.post("/getByTypeAndLocation", async (req,res) => {
    Logger.shared.log(`Getting items of typeId ${req.body.typeId} around location ${req.body?.location}`); //location.coordinates should equal [lng, lat]
    const maxDistance = req.body.maxDistance/6371 ?? 4/6371; //default radius is 4km // you can pass in maxDistance in unit km
    try {
        const items = await Item.find({$and: [{typeId: req.body.typeId}, {location: {$geoWithin: { $centerSphere: [req.body.location.coordinates, maxDistance]}}}]}).populate([{path: 'user', model: 'User', select: ['name', 'mail', 'address', 'location', 'apnTokens']}]); //later optimize to find the nearest (maybe combined with greater geowithin); do it with manual calculations if $near does not work
        Logger.shared.log(`Successfully got items.`);
        res.status(200).json(items);
    } catch(e){
        Logger.shared.log(`Failed getting items: ${e}`);
        res.status(500).json({message: e});
    }
});


export default itemsRouter;


export const items = {
    0: 'Bierbänke und Tische',
    1: 'Liegestuhl',
    2: 'Crêpe Maker',
    3: 'Longboard',
    4: 'Partyzelt',
    5: 'Spikeball',
    6: 'Picknickdecke',
    7: 'Fondue',
    8: 'Donutmaker',
    9: 'Sandwichmaker',
    10: 'Kontaktgrill',
    11: 'Raclette',
    12: 'Aufblasbarer Pool',
    13: 'Waffeleisen',
    14: 'Kinderfahrradanhänger',
    15: 'Hängematte',
    16: 'tragbarer Sonnenschir',
    17: 'Stand-Up Paddle',
    18: 'Fahrradträger',
    19: 'Wanderstock',
    20: 'Dachbox',
    21: 'Surfbrett',
    22: 'Volleyballnetz',
    23: 'Volleyball',
    24: 'Basketball',
    25: 'Fußball',
    26: 'Kayak',
    27: 'Kanu',
    28: 'Rafting Ring',
    29: 'Schlitten',
    30: 'Handsäge',
    31: 'Stichsäge',
    32: 'Kreissäge',
    33: 'Kettensäge',
    34: 'Laubbläser',
    35: 'Freischneider/Motorsense',
    36: 'Zange',
    37: 'Rasenmäher',
    38: 'Vertikutierer',
    39: '(elektrische) Heckenschere',
    40: 'Schubkarre',
    41: 'Sackkarre',
    42: 'Bohrmaschine',
    43: 'Akkuschrauber',
    44: 'Leiter',
    45: 'Hochdruckreiniger',
    46: 'Lötkolben',
    47: 'Gerüst',
    48: 'Schleifgerät',
    49: 'Schweißgerät',
    50: 'Schraubenzieherset',
    51: 'Imbusschlüsselset',
    52: 'Schraubenschlüsselset',
    53: 'Hammer',
    54: 'Autoanhänger',
    55: 'Lautsprecher',
    56: 'Drohne',
    57: 'Action Cam',
    58: 'Gimbal',
    59: 'Mikrofon',
    60: 'Stativ',
    61: 'Softboxen ',
    62: 'Lichterkette',
    63: 'Partybeleuchtung',
    64: 'Mischpult',
    65: 'Greenscreen',
    66: 'Projektor',
    67: 'Leinwand',
    68: 'Zelt',
    69: 'Campingtisch',
    70: 'Campingstühle',
    71: 'Wanderrucksack',
    72: 'Isomatte/Luftmatratze',
    73: 'Koffer',
    74: 'Wanderstöcke',
    75: 'Schlafsack',
    76: 'Fahrradtaschen',
    77: 'Wasserfeste Beutel/Taschen',
    78: 'Wohnwagen',
    79: 'Wohnmobil',
    80: '(mobile) Matratze',
    81: 'Regenschirm',
    9999: "Sonstiges (in Kommentar beschreiben)"
};