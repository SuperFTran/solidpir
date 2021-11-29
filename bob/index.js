import {
    deleteFile,
    getSolidDataset,
    getFile,
    getThingAll,
    getContentType,
    isRawData,
    overwriteFile,
  } from "@inrupt/solid-client";
  import {
    shuffle,
    numToBinary
  } from './helper.mjs';
  import { Session} from "@inrupt/solid-client-authn-browser";

  const SOLID_IDENTITY_PROVIDER = "https://solidcommunity.net";
  document.getElementById(
    "solid_identity_provider"
  ).innerHTML = `[<a target="_blank" href="${SOLID_IDENTITY_PROVIDER}">${SOLID_IDENTITY_PROVIDER}</a>]`;

  const session = new Session();
  const buttonLogin = document.getElementById("btnLogin");
  const readForm = document.getElementById("readForm");
  const public_url = "https://alice.localhost:8443/public/";
  const private_url = "https://bobunsw.solidcommunity.net/private/";
  var docFrag = document.createDocumentFragment();


  // 1a. Start Login Process. Call session.login() function.
  async function login() {
    if (!session.info.isLoggedIn) {
      await session.login({
        oidcIssuer: SOLID_IDENTITY_PROVIDER,
        clientName: "Can I change this",
        redirectUrl: window.location.href
      });
    }
  }

  // 1b. Login Redirect. Call session.handleIncomingRedirect() function.
  // When redirected after login, finish the process by retrieving session information.
  async function handleRedirectAfterLogin() {
    await session.handleIncomingRedirect(window.location.href);
    if (session.info.isLoggedIn) {
      document.getElementById(
        "labelStatus"
      ).innerHTML = `Your session is logged in with the WebID [<a target="_blank" href="${session.info.webId}">${session.info.webId}</a>].`;
      document.getElementById("labelStatus").setAttribute("role", "alert");
      // document.getElementById("solid_url").value = session.info.webId;
    }
  }

  handleRedirectAfterLogin();

  // 2. VIEW FILE OR OPEN FOLDER
  async function readSolidURL() {

    document.getElementById("results").innerHTML = "";
    // document.getElementById("results2").textContent = "";

    // This is the url in the input box
    const solid_url = document.getElementById("solid_url").value;

    // Try to access the URL
    try {
      new URL(solid_url);
    } catch (_) {
      document.getElementById(
        "results"
      ).textContent = `Provided solid_url [${solid_url}] is not a valid URL - please try again`;
      return false;
    }

    // Create the URL object
    const solid_url_obj = new URL(solid_url);

    // If the URL ends in '/' that means that we want to read a container. Therefore
    // we will try to get the folder contents using a Solid Dataset
    if (solid_url.endsWith('/')) {
      let myDataset;
      try {
        if (session.info.isLoggedIn) {
          // Fetch the dataset using authentication if provided
          myDataset = await getSolidDataset(solid_url_obj.href, { fetch: session.fetch });
        } else {
          myDataset = await getSolidDataset(solid_url_obj.href);
        }
      } catch (error) {
        // will show the appropriate error
        document.getElementById(
          "results"
        ).textContent = `Entered value [${solid_url}] is not valid. Error: [${error}]`;
        return false;
      }

      // gets the all the contents of the container
      const file_contents = getThingAll(myDataset);

      // show each item as a button
      for (var i = 0, l = file_contents.length; i < l; i++) {
        // create button
        var x = document.createElement("BUTTON");
        x.setAttribute("display", "block")
        // get the object
        var test_obj = file_contents[i];

        // Skip showing the parent container
        if (test_obj.url == solid_url) {
          continue;
        }
        var obj_string = ''
        // get the url of the obj and detemrine if it is a file or container
        if (test_obj.url.endsWith('/')) {
          obj_string = "Container: " + test_obj.url
        } else {
          obj_string = "File: " + test_obj.url
        }

        var t = document.createTextNode(obj_string);
        x.appendChild(t);
        // when this button is pressed it will do this function again
        // it will also set the back button to the current solid_url
        (function(index){
          x.addEventListener("click", function() {
            var file = file_contents[index];
            document.getElementById("btnBack").value = (' ' + document.getElementById("solid_url").value).slice(1);
            document.getElementById("solid_url").value = file.url
            readSolidURL();
          })
        })(i)

        docFrag.appendChild(x)
        docFrag.appendChild(document.createElement("br"))
        docFrag.appendChild(document.createElement("br"))
      }

      document.getElementById('results').appendChild(docFrag);

    // FOR OPENING FILES
    } else {
      try {
        // file is a Blob (see https://developer.mozilla.org/docs/Web/API/Blob)
        const file = await getFile(
          solid_url,               // File in Pod to Read
          { fetch: session.fetch }       // fetch from authenticated session
        );
        var str = `Fetched a ${getContentType(file)} file from ${solid_url}.<br>`;
        str += `The file is ${isRawData(file) ? "not " : ""}a dataset.<br>`;
        str += await new Response(file).text()
        document.getElementById("results").innerHTML = str;

      } catch (err) {
        console.log(err);
      }
    }
  }

  // Creates private_sub_key.txt and private_bob_zeros.txt
  async function createEncryption() {


    console.log("Creating random binary allocation private key...");
    // Create 256 length array with equal amounts of ones and zeros
    // in random order
    var ones_and_zeros = createOnesAndZeros();
    var ones_and_zeros_str = ones_and_zeros.join().replaceAll(',','');


    targetFileURL = private_url + "private_sub_key.txt";
    writeToFile(targetFileURL, ones_and_zeros_str, "text/plain");
    console.log("Done: Saved in 'private_sub_key.txt'");

    console.log("Encrypting 'permuted.txt'...");
    var zero_indices = getAllIndexes(ones_and_zeros, 0);
    var ones_indices = getAllIndexes(ones_and_zeros, 1);

    for (var i = 0; i < zero_indices.length; i++) {
      zero_indices[i] = zero_indices[i].toString(2).padStart(8, '0');;
      ones_indices[i] = ones_indices[i].toString(2).padStart(8, '0');;
    }

    targetFileURL = private_url + "permuted.txt";
    // access the file
    var file = await getFile(
      targetFileURL,               // File in Pod to Read
      { fetch: session.fetch }       // fetch from authenticated session
      );
    var content_str = "";
    content_str += await new Response(file).text();
    var content_arr = content_str.split('');
    var map_arr = [];

    for (var i = 0; i < content_arr.length; i++) {
      if (content_arr[i] == 0) {
        var rand_num = zero_indices[Math.floor(Math.random()*zero_indices.length)];
      } else {
        var rand_num = ones_indices[Math.floor(Math.random()*zero_indices.length)];
      }
      map_arr.push(rand_num);
    }

    var permuted_subbed = map_arr.join().replaceAll(',','');
    targetFileURL = public_url + "permuted_subbed.txt";
    writeToFile(targetFileURL, permuted_subbed, "text/plain");
    console.log("Done: Created 'permuted_subbed.txt'");
    set_msg("Done: Created 'permuted_subbed.txt'");
    readSolidURL();
  }


  // Decrypt unpermuted_subbed.txt
  async function decrypt() {
    // This is the url in the input box
    console.log("Decrypting 'unpermuted_subbed.txt'...");
    var targetFileURL = public_url + "unpermuted_subbed.txt";
    try {
      var file = await getFile(
        targetFileURL,               // File in Pod to Read
        { fetch: session.fetch }       // fetch from authenticated session
      );
      var sample_str = ""
      sample_str += await new Response(file).text()
    } catch(err) {
      set_msg(err);
    }

    var diff_encrypts = sample_str.split('/');

    for (var i = 0; i < diff_encrypts.length; i++) {
      targetFileURL = private_url + "private_sub_key.txt";
      try {
        var file = await getFile(
          targetFileURL,               // File in Pod to Read
          { fetch: session.fetch }       // fetch from authenticated session
        );
        var bin_nums = ""
        bin_nums += await new Response(file).text();
        bin_str = binify(diff_encrypts[i], bin_nums);
        var name_and_contents = get_string(bin_str);
        console.log(name_and_contents);
        if (name_and_contents.includes('.ttl')) {
          var file_name = name_and_contents.substr(0, name_and_contents.indexOf('.ttl') + 4)
          var contents = name_and_contents.replace(file_name, '')
          targetFileURL = private_url + file_name;
          writeToFile(targetFileURL, contents, "text/turtle");
          console.log("Done: File saved in your private folder :)");
        }
      } catch(err) {
        set_msg(err);
      }
    }
    set_msg("Done: File saved in your private folder :)");
    readSolidURL();
  }

  // Returns the decrypted binary
  function binify(sample_str, bin_nums) {
    // var perm_arr = perm_str.split(',');
    var sample_arr = chunkString(sample_str, 8);
    for (var i = 0; i < sample_arr.length; i++) {
      sample_arr[i] = parseInt(sample_arr[i],2);
      sample_arr[i] = bin_nums[sample_arr[i]];
    }
    sample_arr = sample_arr.join().replaceAll(',','');
    return sample_arr;
  }

  // converts binary to string
  function get_string(raw_binary) {

    // console.log(raw_binary);
    var binary_array = chunkString(String(raw_binary), 8);

    ret = ""
    for (var i = 0; i < binary_array.length; i++) {
      if (binary_array[i] == '00000000') {
        return ret
      }
      ret += String.fromCharCode(parseInt(binary_array[i], 2))
    }
    return ret;
  }

  function chunkString(str, length) {
    return str.match(new RegExp('.{1,' + length + '}', 'g'));
  }

  function getAllIndexes(arr, val) {
    var indexes = [], i = -1;
    while ((i = arr.indexOf(val, i+1)) != -1){
        indexes.push(i);
    }
    return indexes;
  }



  // Write a file to the specified address
  async function writeToFile(targetFileURL, data, text_type) {
    var file = new Blob([data], {type: text_type});
    try {
      await overwriteFile(
        targetFileURL,                                      // URL for the file.
        file,                                               // File
        { contentType: file.type, fetch: session.fetch }    // mimetype if known, fetch from the authenticated session
      );
    } catch (error) {
      console.error(error);
    }
  }

  function createOnesAndZeros() {
    ones = new Array(128).fill(1);
    zeros = new Array(128).fill(0);
    comb = ones.concat(zeros);
    return shuffle(comb);
  }

  // Deletes the file at the target URL
  async function deleteFile(targetFileURL) {
    try {
     await deleteFile(
       targetFileURL,    // File to delete
       { fetch: session.fetch }                 // fetch function from authenticated session
     );
     set_msg("Deleted:: " + targetFileURL);
   } catch (err) {
     set_msg("Doesnt exist");
   }
 }

  function set_msg(msg) {
    document.getElementById(
      "msg"
    ).textContent = msg;
  }

  btnEncrypt.onclick = function () {
    createEncryption();
  };

  btnDecrypt.onclick = function () {
    decrypt();
  };

  buttonLogin.onclick = function () {
    login();
  };

  btnBack.onclick = function () {
    document.getElementById("solid_url").value = document.getElementById("btnBack").value
    readSolidURL();
  };

  readForm.addEventListener("submit", (event) => {
    event.preventDefault();
    readSolidURL();
  });
