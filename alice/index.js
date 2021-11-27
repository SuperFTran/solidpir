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
      // var str = ""
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
        str = err
      }
    }
  }

  // Creates an encryption.txt file with the text contents of all the files
  async function createEncryption() {

    // Deletes encryption.txt if it already exists
    try {
      await deleteFile(
        "https://alice.localhost:8443/public/encryption.txt",  // File to delete
        { fetch: session.fetch }                         // fetch function from authenticated session
      );
      console.log("Deleted:: https://alice.localhost:8443/public/encryption.txt");
    } catch (err) {
      console.error(err);
    }

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
          console.log("hi")
          continue;
        }
        raw_name.push(test_obj.url)

        // access the file
        var file = await getFile(
          test_obj.url,               // File in Pod to Read
          { fetch: session.fetch }       // fetch from authenticated session
          );
        raw_text.push(await new Response(file).text());s
      }

        //
      var text = ""
      for (var i = 0; i < raw_text.length; i++) {
        text += raw_name[i] + `\n`;
        unpadded = textToBinary(raw_text[i]);
        unpadded += ' 00000000'
        unpadded += get_padded(unpadded.length)
        text += unpadded + `\n`;
      }

      console.log(text);

      // Write a file to the specified address
      targetFileURL = "https://alice.localhost:8443/public/encryption.txt";
      var file = new Blob([text], {type: "text/plain"});
      try {
        await overwriteFile(
          targetFileURL,                              // URL for the file.
          file,                                       // File
          { contentType: file.type, fetch: session.fetch }    // mimetype if known, fetch from the authenticated session
        );
      } catch (error) {
        console.error(error);
      }
    } else {
      console.error("URL is a file");
    }
  }


  // Function to convert string to binary and pad the beginning of the string
  const textToBinary = (str = '') => {
    let result = '';
    result = str.split('').map(char => {
       return char.charCodeAt(0).toString(2);
    })

    for (var i = 0; i < result.length; i++) {
      result[i] = result[i].padStart(8, '0');
    }

    let res = result.join(' ');
    return res;
  };

  function get_padded(length) {
    var x = 800 - length
    var ret = ""
    while (x > 0) {
      ret += ' ';
      for (var i = 0; i < 8; i++) {
        ret += Math.round(Math.random());
      }
      x -= 9;
    }

    return ret
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

  readForm.addEventListener("submit", (event) => {
    event.preventDefault();
    readSolidURL();
  });
