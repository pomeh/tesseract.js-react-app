import React, { useEffect, useState } from 'react';
import { createWorker } from 'tesseract.js';
import './App.css';

const journalImageType = /^JOURNAL$/;
const actuImageType = /ACTUALITÉS$/;
const dateMatcher = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;

const eventsMatcher = [
  {
    matcher: /a reçu/,
    name: 'FRIEND_OPENED_GIFT',
  },
  {
    matcher: /Cadeau\.$/,
    name: 'FRIEND_OPENED_GIFT',
  },
  {
    matcher: /de : /,
    name: 'FRIEND_SAVE_GIFT',
  },
  {
    matcher: /a enregistré/,
    name: 'FRIEND_SAVE_GIFT',
  },
  {
    matcher: /t'a envoyé une/,
    name: 'FRIEND_SEND_INVITE',
  },
  {
    matcher: /Invitation !/,
    name: 'FRIEND_SEND_INVITE',
  },
  {
    matcher: /t'a envoyé une Invitation/,
    name: 'FRIEND_SEND_INVITE',
  },
  {
    matcher: /t'a envoyé un/,
    name: 'FRIEND_SEND_GIFT',
  },
  {
    matcher: /Cadeau !/,
    name: 'FRIEND_SEND_GIFT',
  },
  {
    matcher: /Cadeau envoyé à/,
    name: 'GIFT_SENT',
  },
  {
    matcher: /a été attrapé/,
    name: 'POKEMON_CAUGHT',
  },
  {
    matcher: /veut une friandise.$/,
    name: 'DEFENDER_LOW_LIFE',
  },
  {
    matcher: /s’est bien battu/,
    name: 'DEFENDER_DEAD',
  },
  {
    matcher: /et est revenu.$/,
    name: 'DEFENDER_DEAD',
  },
  {
    matcher: /\+\d+/,
    name: 'SKIP_OBJECT_GOT',
    skip: true,
  },
];

// TODO: add tests
function computeText(text) {
  const lines = text.split('\n');
  let res = { type: 'unknown', events: [] };
  let buff = {};

  lines.forEach((l) => {
    if (!l) {
      return;
    }
    console.group(l);
    if (l.match(journalImageType)) {
      res.type = 'Journal';
      console.log('match found', 'Journal');
    } else if (l.match(actuImageType)) {
      res.type = 'Notifications';
      console.log('match found', 'Notifications');
    } else if (l.match(dateMatcher)) {
      console.log('match found', 'Date');
      if (!buff || !buff.name)
      {
        console.warn('found date but buffer is empty', l, buff);
        return;
      }

      res.events.push({
        date: l,
        name: buff.name,
        v: buff.lines.join(' '),
      });
      buff = {};
    } else {
      const foundMatcher = eventsMatcher.some(m => {
        if (!l.match(m.matcher)) {
          return false;
        }

        console.log('match found', l, m);

        if (m.skip === true) {
          console.log('match skipped', l, m);
          return true;
        }

        if (!buff.name) {
          buff.name = m.name
          buff.lines = [];
        }

        if (buff.name !== m.name) {
          console.log('mismatch found', {buff, l});
        } else {
          buff.lines.push(l);
          return true;
        }
      });

      if (!foundMatcher) {
        console.error('no match found for: ', l);

        if (buff && buff.name) {
          console.log('pending buffer: ', buff);
          if (l.match(/^[a-zA-Z0-9\. -]+$/)) {
            console.log('alpha text found, adding to buffer: ', l);
            buff.lines.push(l);
          }
        }
      }
    }
    console.groupEnd();
  });

  if (buff) {
    console.warn('buffer not empty', buff);
  }

  window.res = res;
  return res;
}

function Result({readFile, text}) {
    window.text = text;
    const parsed = computeText(text);
    const parsedStr = JSON.stringify(parsed);
    window.parsed = parsed;
    window.parsedStr = parsedStr;

    return (
      <div className="result">
        <img src={readFile} width="500px" style={{float: "left"}} />
        <div className="step step-1" style={{float: "left"}}>
          {text.split('\n').map((line, index) => (
              <div key={index}>
                  <span>{line}</span>
              </div>
          ))}
        </div>
        <div className="step step-2">
          {parsedStr}
        </div>
        <div className="step step-3">
          {parsed.type}
          <ul>
            {parsed.events && parsed.events.map((e,index) => (
              <li key={index}>
                {e.name} : {e.v}
              </li>
            ))}
          </ul>
        </div>
    </div>
  );
}

function App() {
  const doOCR = async (image) => {
    const worker = await createWorker('fra', 1, {
      logger: m => console.log('worker log', m),
    });

    const { data: { text } } = await worker.recognize(image, {
      rectangle: { top: 0, left: 220, width: 850, height: 2048 },
    });
    window.text = text;
    setOcr(text);
  };

  const [ocr, setOcr] = useState('Recognizing...');
  const [selectedFile, setSelectedFile] = useState();
  const [readFile, setReadFile] = useState();

  useEffect(() => {
    // doOCR('https://tesseract.projectnaptha.com/img/eng_bw.png');
  });

  function onFileChange(event) {
    const file = event.target.files[0];

    window.file = file;
    setSelectedFile(file);

    // Check if the file is an image.
    if (file.type && !file.type.startsWith('image/')) {
      console.log('File is not an image.', file.type, file);
      return;
    }

    var reader = new FileReader();
    reader.addEventListener('load', (event) => {
      window.readFile = event.target.result;

      setReadFile(event.target.result);
      doOCR(event.target.result);
    });
    reader.readAsDataURL(file);
  }

  const fileData = () => {
    if (selectedFile) {
        return (
            <div>
                <h2>File Details:</h2>
                <p>File Name: {selectedFile.name}</p>
                <p>File Type: {selectedFile.type}</p>
            </div>
        );
    } else {
        return (
            <div>
                <br />
                <h4>Choose before Pressing the Upload button</h4>
            </div>
        );
    }
};

  return (
    <div className="App">
      <input type="file" onChange={onFileChange} />
      <p>{fileData()}</p>
      <Result selectedFile={selectedFile} readFile={readFile} text={ocr} />
    </div>
  );
}

export default App;
