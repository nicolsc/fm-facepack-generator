/* jshint esnext:true*/
'use strict';

const sortitoutsi = require('./modules/sortitoutsi');

//Grab arguments
// Syntax node grab-faces.js {id}
const objectId = process.argv[2];

if (!objectId){
  console.warn('Missing required argument {objectId}');
  console.log('Valid syntax is node '+__filename+' {id}');
  process.exit(1);
}

sortitoutsi.getTeamPack(objectId)
.then(
  function(members){
    console.log('Great');
  }
)
.catch(
  function(err){
    console.error(':(', err);
    process.exit(1);
  }
);