import {
    deleteFile,
    getSolidDataset,
    getFile,
    getThingAll,
    getContentType,
    isRawData,
    overwriteFile,
    setUrl,
    setStringNoLocale,
    getThing,
    setThing
  } from "@inrupt/solid-client";
  import { Session} from "@inrupt/solid-client-authn-browser";
  import { SCHEMA_INRUPT } from "@inrupt/vocab-common-rdf";
  import { VCARD } from "@inrupt/vocab-common-rdf";

  // SET VARIABLES
  const SOLID_IDENTITY_PROVIDER = "https://localhost:8443/";
  document.getElementById(
    "solid_identity_provider"
  ).innerHTML = `[<a target="_blank" href="${SOLID_IDENTITY_PROVIDER}">${SOLID_IDENTITY_PROVIDER}</a>]`;

  const session = new Session();
  const buttonLogin = document.getElementById("btnLogin");
  const readForm = document.getElementById("readForm");
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
      document.getElementById("solid_url").value = session.info.webId;
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
            console.log(file.url)
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

    // Deletes encryption.txt if it already exists
    try {
      await deleteFile(
        solid_url + "encryption.txt",  // File to delete
        { fetch: session.fetch }                         // fetch function from authenticated session
      );
      console.log("Deleted:: " + solid_url + "https://alice.localhost:8443/public/encryption.txt");
    } catch (err) {
      console.log("Doesnt exist");
    }

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

      // pad the contents to be same length as others
      var padded_binary = ""
      var max_length = 0
      var processed_string = []
      for (var i = 0; i < raw_text.length; i++) {

        var text = textToBinary(raw_text[i]);
        text += ' 00000000';
        if (text.length > max_length) {
          max_length = text.length
        }
        processed_string.push(text)
      }

      // permute the string and save the permutation order in a txt file.
      for (var i = 0; i < processed_string.length; i++) {
        processed_string[i] = get_padded(processed_string[i], max_length)
        permuted_string = getPerm(processed_string[i])
        
      }


      for (var i = 0; i < unpadded.length; i++) {

        padded_binary += raw_name[i] + ":\r\n" + unpadded[i] + "\r\n";
      }

      // console.log(perm);
      console.log(unpadded);

      // Write a file to the specified address
      targetFileURL = solid_url + "encryption.txt";
      // console.log(solid_url)
      var file = new Blob([padded_binary], {type: "text/plain"});
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
    } else {
      console.error("URL is a file");
      document.getElementById(
        "msg"
      ).textContent = `Cannot encrypt a file`;
    }
    readSolidURL();
  }


  function getPerm(text) {
    text.replace(' ', '');
    arr = [...Array(text.length).keys()]
    return shuffle(arr);
  }

  function shuffle(array) {
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


  // Function to convert string to binary and pad the beginning of the string
  const textToBinary = (str = '') => {
    let result = [];
    result = str.split('').map(char => {
       return char.charCodeAt(0).toString(2);
    })

    for (var i = 0; i < result.length; i++) {
      result[i] = result[i].padStart(8, '0');
    }

    let res = result.join(' ');
    return res;
  };

  // Function to pad the entire string with random binary to achieve same lengths
  function get_padded(string, max_length) {
    // var x = 1000 - length
    // var ret = ""
    while (string.length < max_length) {
      string += ' ';
      for (var i = 0; i < 8; i++) {
        string += Math.round(Math.random());
      }
      // x -= 9;
    }
    return string
  }

  function set_msg(msg) {
    document.getElementById(
      "msg"
    ).textContent = msg;
  }


  // Decrypt encryption.txt
  async function decrypt() {
    // This is the url in the input box
    const solid_url = document.getElementById("solid_url").value;

    // access the file
    try {
      var file = await getFile(
        solid_url + "encryption.txt",               // File in Pod to Read
        { fetch: session.fetch }       // fetch from authenticated session
      );
      raw_binary = await new Response(file).text()
      name_and_contents = get_string(raw_binary)
      var file_name = name_and_contents.substr(0, name_and_contents.indexOf('.ttl') + 4)
      var contents = name_and_contents.replace(file_name, '')
      var file = new Blob([contents], {type: "text/turtle"});
      try {
        await overwriteFile(
          solid_url + "/blah/" + file_name,                                      // URL for the file.
          file,                                               // File
          { contentType: file.type, fetch: session.fetch }    // mimetype if known, fetch from the authenticated session
        );
        set_msg(`SUCCESS: Decryption in whatevr`);
      } catch (error) {
        console.error(error);
      }
      
    } catch(error) {
      console.error(error);
    }
  }

  // converts binary to string
  function get_string(raw_binary) {

    binary_array = raw_binary.split(" ")
    ret = ""
    for (var i = 0; i < binary_array.length; i++) {
      if (binary_array[i] == '00000000') {
        return ret
      }
      ret += String.fromCharCode(parseInt(binary_array[i], 2))
    }
    return ret;
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

  readForm.addEventListener("submit", (event) => {
    event.preventDefault();
    readSolidURL();
  });
