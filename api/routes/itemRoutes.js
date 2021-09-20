import express from "express"

import Logger from "../../Logger.js"

import Item from "../models/Item.js"
// import User from "../models/User.js"

const itemsRouter = express.Router();

// get items by location // maybe add authentication by userId later, so hackers cannot find the address of a user, but for now it should be fine
itemsRouter.post("/getByTypeAndLocation", async (req,res) => {
    Logger.shared.log(`Getting items of typeId ${req.body.typeId} around location ${req.body.location}`); //location.coordinates should equal [lng, lat]
    const maxDistance = req.body.maxDistance ?? 4/6371; //default radius is 4km
    try {
        const items = Item.find({$and: [{typeId: req.body.typeId}, {location: {$geoWithin: { $centerSphere: [location.coordinates, maxDistance]}}}]});
        res.status(200).json(items);
    } catch(e){
        Logger.shared.log(`Failed getting items: ${e}`);
    }
});


export default itemsRouter;


// below is mostly for reference, and because I may need it later in the frontend

const items = [
    "Bierbänke und Tische",
    "Liegestuhl",
    "Crêpe Maker",
    "Longboard",
    "Partyzelt",
    "Spikeball",
    "Picknickdecke",
    "Fondue",
    "Donutmaker",
    "Sandwichmaker",
    "Kontaktgrill",
    "Raclette",
    "Aufblasbarer Pool",
    "Waffeleisen",
    "Kinderfahrradanhänger",
    "Hängematte",
    "tragbarer Sonnenschir",
    "Stand-Up Paddle",
    "Fahrradträger",
    "Wanderstock",
    "Dachbox",
    "Surfbrett",
    "Volleyballnetz",
    "Volleyball",
    "Basketball",
    "Fußball",
    "Kayak",
    "Kanu",
    "Rafting Ring",
    "Schlitten",
    "Handsäge",
    "Stichsäge",
    "Kreissäge",
    "Kettensäge",
    "Laubbläser",
    "Freischneider/Motorsense",
    "Zange",
    "Rasenmäher",
    "Vertikutierer",
    "(elektrische) Heckenschere",
    "Schubkarre",
    "Sackkarre",
    "Bohrmaschine",
    "Akkuschrauber",
    "Leiter",
    "Hochdruckreiniger",
    "Lötkolben",
    "Gerüst",
    "Schleifgerät",
    "Schweißgerät",
    "Schraubenzieherset",
    "Imbusschlüsselset",
    "Schraubenschlüsselset",
    "Hammer",
    "Autoanhänger",
    "Lautsprecher",
    "Drohne",
    "Action Cam",
    "Gimbal",
    "Mikrofon",
    "Stativ",
    "Softboxen ",
    "Lichterkette",
    "Partybeleuchtung",
    "Mischpult",
    "Greenscreen",
    "Projektor",
    "Leinwand",
    "Zelt",
    "Campingtisch",
    "Campingstühle",
    "Wanderrucksack",
    "Isomatte/Luftmatratze",
    "Koffer",
    "Wanderstöcke",
    "Schlafsack",
    "Fahrradtaschen",
    "Wasserfeste Beutel/Taschen",
    "Wohnwagen",
    "Wohnmobil",
    "(mobile) Matratze",
    "Regenschirm"
];

let reverse = {};
let asdict = {}
for (let i = 0; i < items.length; i++){
    reverse[items[i]] = i;
    asdict[i] = items[i];
}
