const fs = require('fs');

/**
 * Node JS Script to convert currency
 *
 * Input should look like this :
 * FROM_CUR;AMOUNT;TO_CUR
 * Number of conversions
 * FROM_CUR;TO_CUR;UNIT_CONVERSION
 * FROM_CUR;TO_CUR;UNIT_CONVERSION
 * FROM_CUR;TO_CUR;UNIT_CONVERSION
 * eg:
 * EUR;912.12;USD
 * 4
 * EUR;CAD;1.12
 * CAD;JPY;119
 * CAD;AUD;0.98
 * AUD;USD;1.28
 * Dijkstra algorithm will be applied to the conversion graph (number of conversion required).
 * Using the prev dictionary we retrace the path to reach our currency and reduce the conversion rates.
*/

let input = [];               // File as array
let target = [];              // Target line : origin currency, amount, target currency
let numberRate = undefined;   // Number of exchange rates
let conversions = [];          // conversions table
let reverse = [];             // Reverse table of conversions : reverse rate = 1/rates

// Dijkstra distance and previous
let dist = {};
let prev = {};

let v_set = new Set(); // Graph summits

let result = 0;        // Converted amount

// Log input file
console.log('==================================');
console.log('INPUT FILE');
console.log(process.argv[2]);

// Test call argument, if undefined, set file to devises.txt
// prepareData from input file
if(process.argv[2] != undefined){
  prepareData(process.argv[2]);
} else {
  prepareData('devises.txt');
}

// Dijkstra algorithm
dijkstra();

// Log result
console.log('==================================');
console.log('CONVERTED AMOUNT');
console.log(parseFloat(result.toFixed(4)), target[2]);

// Function that prepare all data needed to dijkstra algorithm
function prepareData(fileToRead) {
  try {
    // Open file
    const data = fs.readFileSync(fileToRead, 'utf8');
    // Split text to array of string
    input = data.split('\n');

    // Get target input (line 0), split string to array
    target = input[0].split(';');
    // Parse string amount to int
    target[1] = parseInt(target[1]);

    // Get number rates and parse it to int
    numberRate = parseInt(input[1]);

    // Remove all lines after the number of rates + 2 (the target and number rates lines)
    input.splice(numberRate + 2, (input.length - numberRate + 2));

    // Define conversions array - remove 2 first lines and map the line as an array
    // of string and parse last column to float
    conversions = input.splice(2).map(rawRates => {
      splitedRates = rawRates.split(';');
      return {from: splitedRates[0], to: splitedRates[1], rate: parseFloat(splitedRates[2])};
    });

    // Rule : (eg) AUD -> USD = 1.9
    // USD -> AUD = 1 / 1.9
    // Create a reverse array for each line
    for (let conversion of conversions) {
      if(conversion.from != '') {
        // Round to 4 decimals
        reverse.push({from:conversion.to, to:conversion.from, rate:parseFloat((1/conversion.rate).toFixed(4))});
      }
    }

    // Extend the conversions array with the result reverse array
    conversions = conversions.concat(reverse);

    // Log data and target conversion
    console.log('==================================');
    console.log(`Expected conversion : ${target[1]} ${target[0]} to ${target[2]}`);
    console.log('==================================');
    console.log(`Number of exchange rates : ${numberRate}`);
    console.log('==================================');
    console.log('Exchange rates : \n');
    console.log(conversions);
    console.log('==================================');

  } catch(e) {
    console.error(`Error : ${e.stack}`)
  }
}

// Dijkstra algorithm
function dijkstra(){
  // Fill set and dictionaries with conversions table
  for (let rate of conversions){
    dist[rate.from] = Infinity; // Default dist is infinity
    prev[rate.from] = undefined; // Default previous summit is undefined (start summit has no previous)
    if(!v_set.has(rate.from)) v_set.add(rate.from); // Add summit to the set if was not added before
  }

  // Starting point dist is 0
  dist[target[0]] = 0;

  while(v_set.size > 0) {
    // Get the nearest summit from the v_set for dist dictionary
    let nearest = Array.from(v_set).reduce((min, rate) => dist[rate] < dist[min] ? rate : min);

    // Remove the summit from the set
    v_set.delete(nearest);

    // Look for the neighbours of the summit
    for(let neighbour of conversions.filter(rate => rate.from === nearest).map(rate => rate.to)) {
      let alt = dist[nearest] + 1; // Set the distance to 1 because it's a step
      if (alt < dist[neighbour]) {
        dist[neighbour] = alt;
        prev[neighbour] = nearest;
      }
    }
  }

  // Log dist and prev distionaries
  console.log('DISTANCE');
  console.log(dist);
  console.log('==================================');
  console.log('PREVIOUS');
  console.log(prev);
  console.log('==================================');

  // Contains needed rates to convert the amount
  let compute = [];
  let nextCurr = target[2];

  // Recover all rates
  while (prev[nextCurr] != undefined) {
    let before = prev[nextCurr];
    compute.push((conversions.filter(rate => rate.from === before && rate.to === nextCurr))[0]);
    nextCurr = before;
  }

  // Log shortest path and multiplier
  console.log('SHORTEST CONVERSION PATH');
  console.log(compute);
  console.log('==================================');
  console.log('CONVERSION MULTIPLIER');
  console.log(compute.reduce((acc, val) => acc * val.rate, 1));

  // Convert the amount to the target currency
  result = target[1] * compute.reduce((acc, val) => acc * val.rate, 1);
}
