// Shuffles an array randomly
export function shuffle(array) {
  let currentIndex = array.length,  randomIndex;
  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
    array[randomIndex], array[currentIndex]];
  }
  return array;
}

// Function to convert string to binary
export function numToBinary(num) {
  let result = [];
  result = str.split('').map(char => {
     return char.charCodeAt(0).toString(2);
  })

  for (var i = 0; i < result.length; i++) {
    result[i] = result[i].padStart(8, '0');
  }

  let res = result.join('');
  return res;
};

// Function to convert string to binary
export function binaryToNum(num) {
  let result = [];
  result = str.split('').map(char => {
     return char.charCodeAt(0).toString(2);
  })

  for (var i = 0; i < result.length; i++) {
    result[i] = result[i].padStart(8, '0');
  }

  let res = result.join('');
  return res;
};