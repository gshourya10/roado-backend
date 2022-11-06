const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
const Word = require("./models/word");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect("mongodb://127.0.0.1:27017/dictionary-app", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

app.post("/words", async (req, res) => {
  if (!req.body.hasOwnProperty("word_id")) {
    res.status(400).json({ error: "word_id not found" });
    return;
  }

  const word_id = req.body.word_id;

  const word_present = await Word.findOne({ word: word_id })
    .select("_id")
    .lean();

  if (word_present) {
    res.status(200).json({ error: `${word_id} is already present` });
    return;
  }

  const response = await axios.get(
    `https://od-api.oxforddictionaries.com/api/v2/entries/en-us/${word_id}`,
    {
      headers: {
        app_id: "973e3b31",
        app_key: "48df95ed486003a8a91a3c40245fedd2",
      },
    }
  );
  const data = response.data;

  if (data.hasOwnProperty("error")) {
    res.status(404).json(data);
    return;
  }

  const word = new Word();
  word.word = data.word;
  word.etymologies = data.results[0].lexicalEntries[0].entries[0].etymologies;

  for (let lexicalEntry of data.results[0].lexicalEntries) {
    const sense = {};
    sense.lexicalCategory = lexicalEntry.lexicalCategory.id;
    const meanings = [];
    for (let entry of lexicalEntry.entries) {
      for (let s of entry.senses) {
        const meanings_obj = {
          definition: s.definitions[0],
        };
        if (s.hasOwnProperty("examples")) {
          meanings_obj["examples"] = s.examples.map((example) => {
            return example.text;
          });
        }
        meanings.push(meanings_obj);
        if (s.hasOwnProperty("subsenses")) {
          for (let subsense of s.subsenses) {
            const subsense_obj = {
              definition: subsense.definitions[0],
            };
            if (subsense.hasOwnProperty("examples")) {
              subsense_obj["examples"] = subsense.examples.map((example) => {
                return example.text;
              });
            }
            meanings.push(subsense_obj);
          }
        }
      }
    }
    sense.meanings = meanings;
    word.senses.push(sense);
  }

  await word.save();

  res.status(201).json(word);
});

app.get("/words", async (req, res) => {
  const select = {
    word: 1,
    "senses.lexicalCategory": 1,
    "senses.meanings.definition": 1,
  };
  const words = await Word.find({}).select(select);
  res.status(200).json({ words });
});

app.get("/words/:word", async (req, res) => {
  const { word } = req.params;
  const data = await Word.findOne({ word });

  if (!data) {
    res.status(404).json({ message: "word not present" });
    return;
  }

  res.status(200).json(data);
});

app.get("/", (req, res) => {
  res.send("Hi");
});

app.listen(8080, () => {
  console.log("Listening on port 8080");
});

// api_url = https://od-api.oxforddictionaries.com/api/v2
// app_id = 973e3b31
// app_key = 48df95ed486003a8a91a3c40245fedd2
