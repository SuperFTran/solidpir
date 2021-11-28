// Return an array of permutations, based on the number of values and 
// how many permutations are required
export function getPerm(text_length, num_texts) {
  perm_order = []
  for (var i = 0; i < num_texts; i++) {
    var arr = [...Array(text_length).keys()]
    perm_order[i] = shuffle(arr)
  }
  return perm_order;
}

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
export function textToBinary(str) {
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

// Function to pad the entire string with random binary to achieve same lengths
export function get_padded(string, max_length) {
  while (string.length < max_length) {
    for (var i = 0; i < 8; i++) {
      string += Math.round(Math.random());
    }
  }
  return string
}