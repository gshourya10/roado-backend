const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const wordSchema = new Schema({
  word: String,
  etymologies: [String],
  senses: [
    {
      lexicalCategory: String,
      meanings: [
        {
          definition: String,
          examples: [String],
        },
      ],
    },
  ],
});

const Word = new mongoose.model("Word", wordSchema);

module.exports = Word;
