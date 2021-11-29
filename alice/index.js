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
    getPerm,
    textToBinary,
    get_padded
  } from './helper.mjs';
  import { Session} from "@inrupt/solid-client-authn-browser";

  // SET VARIABLES
  const SOLID_IDENTITY_PROVIDER = "https://localhost:8443/";
  document.getElementById(
    "solid_identity_provider"
  ).innerHTML = `[<a target="_blank" href="${SOLID_IDENTITY_PROVIDER}">${SOLID_IDENTITY_PROVIDER}</a>]`;

  const session = new Session();
  const buttonLogin = document.getElementById("btnLogin");
  const readForm = document.getElementById("readForm");
  const public_url = "https://alice.localhost:8443/public/";
  const private_url = "https://alice.localhost:8443/private/";
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
        var str = `Fetched a ${getContentType(file)} file from ${solid_url}.\n`;
        str += `The file is ${isRawData(file) ? "not " : ""}a dataset.\n`;
        str += await new Response(file).text()
        document.getElementById("results").textContent = str;

      } catch (err) {
        console.log(err);
      }
    }
  }

  // Creates an encryption.txt file with the text contents of all the files
  async function createEncryption() {

    // This is the url in the input box
    const solid_url = document.getElementById("solid_url").value;
    
    // targetFileURL = solid_url + "permutation.txt";
    // // deleteFile(targetFileURL);
    // targetFileURL = solid_url + "sample.txt";
    // deleteFile(targetFileURL);
    // targetFileURL = "https://alice.localhost:8443/public/blah/"
    // deleteFile(targetFileURL);

    // Try to access the URL
    try {
      new URL(solid_url);
    } catch (_) {
      document.getElementById(
        "msg"
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
          "msg"
        ).textContent = `Entered value [${solid_url}] is not valid. Error: [${error}]`;
        return false;
      }


      // Read each item contents and add it to an array
      // raw_name stores the urls of the files in an array
      // raw_text stores the contents of the files in an array
      const file_contents = getThingAll(myDataset);
      var raw_name = []
      var raw_text = []
      for (var i = 0, l = file_contents.length; i < l; i++) {
        // get the object
        var test_obj = file_contents[i];
        if (test_obj.url == solid_url) {
          continue;
        }

        short_name = test_obj.url.replace(solid_url,'');
        raw_name.push(short_name)

        // access the file
        var file = await getFile(
          test_obj.url,               // File in Pod to Read
          { fetch: session.fetch }       // fetch from authenticated session
          );
        var content_str = short_name;
        content_str += await new Response(file).text()
        raw_text.push(content_str);
      }

      // add the '00000000' indicator for end of actual string and
      // find the length of the longest string
      var padded_permuted_binary = ""
      var max_length = 0
      var processed_string = []
      for (var i = 0; i < raw_text.length; i++) {
        var text = textToBinary(raw_text[i]);
        text += '00000000';
        if (text.length > max_length) {
          max_length = text.length
        }
        processed_string.push(text)
      }

      // get the permutations I need
      var permutation_array = getPerm(processed_string[0].length, processed_string.length)
      var permutation_text = ""

      for (var i = 0; i < permutation_array.length; i++) {
        permutation_text += permutation_array[i];
        if (i + 1 != permutation_array.length) {
          permutation_text += ",";
        }
      }

      // write the permutations
      var targetFileURL = private_url + "permutation.txt";
      writeToFile(targetFileURL, permutation_text, "text/plain");

      // pad the strings to the max length (same length) and create
      // a permutation order for each string and save it
      // permute the string and save the permutation order in a txt file.
      for (var i = 0; i < processed_string.length; i++) {
        processed_string[i] = get_padded(processed_string[i], max_length)
        processed_string[i] = permute(processed_string[i], permutation_array[i])
      }


      for (var i = 0; i < processed_string.length; i++) {

        padded_permuted_binary += raw_name[i] + ":\r\n" + processed_string[i] + "\r\n";
      }

      targetFileURL = public_url + "encryption.txt";
      writeToFile(targetFileURL, padded_permuted_binary, "text/plain");

    } else {
      console.error("URL is a file");
      document.getElementById(
        "msg"
      ).textContent = `Cannot encrypt a file`;
    }
    readSolidURL();
  }

  function permute(string, perm_order) {
    // console.log(string)
    // console.log(perm_order)
    var ret = "";
    for (var i = 0; i < perm_order.length; i++) {
      ret += string[perm_order[i]];
    }
    // console.log(ret)
    return ret;
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

  // Write a file to the specified address
  async function writeToFile(targetFileURL, data, text_type) {
    var file = new Blob([data], {type: text_type});
    try {
      await overwriteFile(
        targetFileURL,                                      // URL for the file.
        file,                                               // File
        { contentType: file.type, fetch: session.fetch }    // mimetype if known, fetch from the authenticated session
      );
      set_msg(`SUCCESS: Encryption in encryption.txt`);
    } catch (error) {
      console.error(error);
    }
  }

  function set_msg(msg) {
    document.getElementById(
      "msg"
    ).textContent = msg;
  }


  // Decrypt encryption.txt
  async function decrypt() {

    var targetFileURL = public_url + "double_encrypt.txt";
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
    // var raw_binary = readFile(targetFileURL);

    targetFileURL = private_url + "permutation.txt";
    try {
      var file = await getFile(
        targetFileURL,               // File in Pod to Read
        { fetch: session.fetch }       // fetch from authenticated session
      );
      var perm_str = ""
      perm_str += await new Response(file).text()
      var perm_arr = perm_str.split(',');
      console.log(perm_arr);
      // var diff_perms = chunkString(perm_arr, sample_str.length);
      var chunk = sample_str.length/8;
      // console.log(chunk);
      var diff_perms = [];
      for (var i = 0; i < perm_arr.length; i += chunk) {
        var temporary = perm_arr.slice(i, i + chunk);
        diff_perms.push(JSON.parse(JSON.stringify(temporary)));
        // do whatever
      }

      console.log(diff_perms);
      var unpermuted_str = "";

      for (var i = 0; i < diff_perms.length; i++) {
        unpermuted_str += unpermute(sample_str, diff_perms[i]);
        if (i + 1 != diff_perms.length) {
          unpermuted_str += '/';
        }
      }
      
      // console.log(unpermuted_str)
  
      targetFileURL = public_url + "decrypted_alice.txt";
      // writeToFile(targetFileURL, contents, "text/turtle");
      writeToFile(targetFileURL, unpermuted_str, "text/turtle");
      set_msg("decrypted");
    } catch(err) {
      set_msg(err);
    }

    readSolidURL();
  }

  function unpermute(sample_str, perm_arr) {
    // console.log(perm_str);
    console.log(perm_arr);
    // var sample_arr = sample_str.split();
    var sample_str = chunkString(sample_str, 8);
    var sample_arr = JSON.parse(JSON.stringify(sample_str))
    // console.log(sample_arr);

    for (var i = 0; i < sample_str.length; i++) {
        sample_arr[parseInt(perm_arr[i])] = sample_str[i];
    }
    console.log(sample_arr);
    var ret = sample_arr.join().replaceAll(',','');

    return ret;
  }


  // converts binary to string
  function get_string(raw_binary) {

    console.log(raw_binary);
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

  // Creates an encryption.txt file with the text contents of all the files
  async function reset() {
    var targetFileURL = public_url + "encryption.txt";
    deleteFile(targetFileURL);
    targetFileURL = public_url + "decrypted_alice.txt";
    deleteFile(targetFileURL);
    targetFileURL = public_url + "double_encrypt.txt";
    deleteFile(targetFileURL);
    targetFileURL = private_url + "permutation.txt";
    deleteFile(targetFileURL);
    readSolidURL();
  }



  buttonLogin.onclick = function () {
    login();
  };

  btnBack.onclick = function () {
    document.getElementById("solid_url").value = document.getElementById("btnBack").value
    readSolidURL();
  };

  btnEncrypt.onclick = function () {
    createEncryption();
  };

  btnDecrypt.onclick = function () {
    decrypt();
  };

  btnReset.onclick = function () {
    reset();
  };

  readForm.addEventListener("submit", (event) => {
    event.preventDefault();
    readSolidURL();
  });
