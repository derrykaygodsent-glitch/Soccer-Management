/* Meridian Football Universe, foundation 1.0. IDs are scoped by country, never by city name alone. */
(function(g){'use strict';
const continents=[
 ['Europa','Many clubs have a long history and rich owners. Players are known for their skill on the ball. Matches against local rivals matter to fans.','Europa Champions Cup'],
 ['Afrania','Fans cheer loudly. Football schools help strong young players develop. Some go on to play for their country.','Afrania Champions League'],
 ['Nordica','Teams play hard and defend well. Fans fill old stadiums when local rivals meet.','Nordica Elite Cup'],
 ['Pacifica','Coaches spend time on team plans and ball skills. Businesses put money into the growing leagues.','Pacifica Champions Trophy'],
 ['Sudamerica','Teams like to attack. Fans remember players who create goals, especially in matches between local rivals. Many young players train at football schools.','Sudamerica Libertadores']
].map(([name,identity,competition])=>({name,identity,competition}));
// Each place is paired explicitly with its home club. The capital is first.
const rows=[
 ['Europa','VLD','Valdoria','Grandessa|Grandessa FC','Vesterholm|Vesterholm Athletic','Ironhaven|Ironhaven United','Millbrook|Millbrook Town','Redwick|Redwick Rovers'],
 ['Europa','EST','Estavelle','Castavelle|Real Castavelle','Bellmont|Bellmont City','Ardin|Ardin Sporting','Westmere|Westmere FC','Kingswell|Kingswell United'],
 ['Europa','CAL','Caldria','San Aurelio|San Aurelio FC','Port Azure|Port Azure Sporting','Maravilla|Maravilla CF','Sorello|Sorello Calcio','Eastwick|Eastwick United'],
 ['Europa','MTL','Monteluce','Bellacosta|Bellacosta FC','Monteverde|Monteverde Athletic','San Vito|San Vito Calcio','Valmere|Valmere United','Rocaforte|Rocaforte FC'],
 ['Afrania','ZAN','Zandora','Kintaba|Kintaba United','Densari|Densari FC','Mavelle|Mavelle Sporting','Koroba|Koroba City','East Kintaba|East Kintaba FC'],
 ['Afrania','NEM','Nembala','Asenga|Asenga Stars','Bolani|Bolani United','Kofira|Kofira FC','Tembwe|Tembwe Athletic','Nambara|Nambara City'],
 ['Afrania','KOR','Kordane','Belako|Belako FC','Doruma|Doruma United','Kessan|Kessan Athletic','Ariba|Ariba Sporting','Port Kord|Port Kord FC'],
 ['Afrania','TAV','Tavira','Mavuno|Mavuno City','Luthala|Luthala FC','Ndera|Ndera United','Kasumbi|Kasumbi Stars','Tavik|Tavik Athletic'],
 ['Nordica','NOR','Norvaska','Vesterholm|Vesterholm FK','Frostvik|Frostvik United','Northhaven|Northhaven FC','Eldermere|Eldermere Athletic','Skarstad|Skarstad IF'],
 ['Nordica','WES','Westmark','Alverton|Alverton City','Westborough|Westborough Town','Ashbourne|Ashbourne FC','Wexford|Wexford Rovers','Kingsport|Kingsport United'],
 ['Nordica','DRA','Dravonia','Novigrad|Novigrad FK','Draxford|Draxford United','Keldon|Keldon FC','Bracken|Bracken Athletic','Ostrel|Ostrel City'],
 ['Nordica','RAV','Ravensk','Arkenford|Arkenford FC','Dunhaven|Dunhaven United','Coldstream|Coldstream Athletic','Ravensby|Ravensby FC','Hallowick|Hallowick Town'],
 ['Pacifica','AZM','Azmara','Kaishen|Kaishen FC','Lingdao|Lingdao United','Shenzena|Shenzena Athletic','Yushiro|Yushiro City','Port Kai|Port Kai FC'],
 ['Pacifica','VEL','Veloria','Tanshiro|Tanshiro FC','Nakamura|Nakamura United','Hoshima|Hoshima Athletic','Kurei|Kurei City','East Tanshiro|East Tanshiro FC'],
 ['Pacifica','SOR','Sorelia','Nakamori|Nakamori FC','Senda|Senda United','Maruko|Maruko Athletic','Yatami|Yatami City','Solport|Solport FC'],
 ['Pacifica','KIN','Kintaro','Port Senga|Port Senga FC','Kambara|Kambara United','Natsuki|Natsuki Athletic','Belora|Belora City','Kintai|Kintai FC'],
 ['Sudamerica','MER','Meridia','Santa Espera|Santa Espera FC','Rio Blanco|Rio Blanco Athletic','San Mateo|San Mateo United','Cordillera|Cordillera FC','Las Palmas|Las Palmas Sporting'],
 ['Sudamerica','SOL','Solmera','Nueva Sol|Nueva Sol FC','Puerto Sol|Puerto Sol Athletic','Valverde|Valverde United','Santa Rosa|Santa Rosa FC','Mirador|Mirador Sporting'],
 ['Sudamerica','BEL','Bellvaria','San Cordoba|San Cordoba FC','Estrella|Estrella United','Monte Azul|Monte Azul Athletic','San Lucas|San Lucas FC','Belavista|Belavista Sporting'],
 ['Sudamerica','ORV','Orvessa','Puerto Real|Puerto Real FC','San Marcos|San Marcos United','Villa Norte|Villa Norte Athletic','Costa Brava|Costa Brava FC','El Dorado|El Dorado Sporting']
];
const slug=s=>s.toLowerCase().replaceAll(' ','-');
const countries=rows.map(([continent,code,name,...pairs])=>{const places=pairs.map((v,i)=>{const [city,club]=v.split('|'),id=code+'-'+slug(city);return {id,name:city,capital:i===0,club:{id:code+'-'+slug(club),name:club,home:id}};});return {code,name,continent,capital:places[0].name,places,association:name+' Football Association'};});
const rivalries=[['Grandessa','Historic','VLD',2],['Castavelle','City','EST',1],['Kintaba','National','ZAN',1],['Asenga','Regional','NEM',1],['Alverton','Traditional','WES',1],['Novigrad','Industrial','DRA',1],['Kaishen','Commercial','AZM',1],['Santa Espera','Fierce','MER',1]].map(([name,nature,code,b])=>{const c=countries.find(x=>x.code===code);return {name:name+' Derby',nature,clubs:[c.places[0].club.id,c.places[b].club.id]};});
const universe={version:'1.0',continents,countries,rivalries,divisionSize:16,divisions:['Premier League','Championship','Regional League'],domestic:['National Cup','League Cup','Super Cup','Reserve League','Under-21 League','Under-18 League'],global:['World Club Championship','International Nations Cup','Global Super Cup','Intercontinental Cup']};
g.TLMeridian=universe;if(typeof module!=='undefined')module.exports=universe;
})(typeof window==='undefined'?globalThis:window);
