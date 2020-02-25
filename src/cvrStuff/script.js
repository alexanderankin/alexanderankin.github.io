(function() {
  var inputBtn, inputForm, fileInput, inputList, outputBtn;

  var data = {};
  var files = [];

  function convert(candidates, contests, precincts, countingGroups, ballotTypes, cvrData) {
    function parseManifest( data ) {
      var map = {};
      for ( let entry of data.List ) {
        map[ entry.Id ] = entry.Description;
      }
      return map;
    }

    candidates = parseManifest(candidates);
    contests = parseManifest(contests);
    precincts = parseManifest(precincts);
    countingGroups = parseManifest(countingGroups);
    ballotTypes = parseManifest(ballotTypes);

    function ranksToArray( marks ) {
      let arr = [];
      for ( let mark of marks ) {
        if ( arr[ mark.Rank - 1 ] === undefined ) {
          arr[ mark.Rank - 1 ] = mark;
        } else if ( Array.isArray( arr[ mark.Rank - 1 ] ) ) {
          arr[ mark.Rank - 1 ] = [ ...arr[ mark.Rank - 1 ], mark ];
        } else {
          arr[ mark.Rank - 1 ] = [ arr[ mark.Rank - 1 ], mark ];
        }
      }
      return arr;
    }

    var counter = 0;
    console.log('Found', cvrData.Sessions.length);

    return cvrData.Sessions.map( function ( session ) {
      if (++counter % 1000 === 0)
        console.log('Finished', counter)

      let ballot = session.Modified || session.Original;
      let data = {
        countingGroup: countingGroups[ session.CountingGroupId ],
        precinct: precincts[ ballot.PrecinctPortionId ],
        ballotType: ballotTypes[ ballot.BallotTypeId ]
      };
      for ( let contest of ballot.Contests ) {
        data[ contests[ contest.Id ] ] = ranksToArray( contest.Marks.filter( (m) => !m.IsAmbiguous ) )
          .map( (m) => Array.isArray( m ) ? m.map( (n) => n ? candidates[ n.CandidateId ] : null ) : m ? candidates[ m.CandidateId ] : null );
      }
      return data;
    } );
  }

  async function main() {
    inputBtn = $('#input-button');
    inputForm = $('#input-form');
    outputBtn = $('#output-button');
    fileInput = $('#input-input');
    inputList = $('#input-list');

    inputBtn.on('dragover', e => { e.preventDefault(); inputBtn.addClass('ready-input'); });
    inputBtn.on('dragexit', e => { e.preventDefault(); inputBtn.removeClass('ready-input'); });
    inputBtn.on('drop', e => {
      e.preventDefault();
      inputBtn.removeClass('ready-input');
      fileInput.get(0).files = e.originalEvent.dataTransfer.files;
      fileInput.trigger('change', e.originalEvent.target.files);
    });


    fileInput.on('change', async e => {
      try {
        files.length = 0;
        for (var i = 0; i < fileInput.get(0).files.length; i++) {
          files.push(fileInput.get(0).files[i])
        }

        data = {};

        var ca = data.candidates = await tryToGet(files, 'CandidateManifest.json');
        var co = data.contests = await tryToGet(files, 'ContestManifest.json');
        var pr = data.precincts = await tryToGet(files, 'PartyManifest.json');
        var cg = data.countingGroups = await tryToGet(files, 'CountingGroupManifest.json');
        var bt = data.ballotTypes = await tryToGet(files, 'BallotTypeManifest.json');
        var cvr = data.cvrData = await tryToGet(files, 'CvrExport.json');

        var result = convert(ca, co, pr, cg, bt, cvr);
        ca = co = pr = cg = bt = cvr = null;

        var save = document.createElement('a');
        var file = new File([JSON.stringify(result)], 'converted.json', { type: 'application/json'});
        alert('ok')
        save.href = URL.createObjectURL(file);
        save.download = 'filename.json';
        save.click();
      } catch (e) {
        addError(e);
        throw e;
      }
    });

    inputBtn.on('click', e => {
      fileInput.click();
    })

  }

  async function parseFile(file) {
    return new Promise((resolve, reject) => {
      var reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(JSON.parse(reader.result));
      reader.readAsBinaryString(file);
    });
  }

  async function tryToGet(list, name) {
    var theFile = null;
    for (var i = 0; i < list.length; i++) {
      var file = list[i];
      if (file.name === name) {
        theFile = file;
        break;
      }
    }

    try {
      return await parseFile(theFile);
    } catch (e) {
      throw new Error('Could not read file ' /*+ theFile && theFile.name || undefined*/ + ' for ' + name);
    }
  }

  $(main);

  function addError(title, message) {
    console.log(title, message)
    $('#errors').append($(
        '<div class="alert alert-danger" role="alert">' + 
        '<button type="button" onclick="this.parentElement.remove()" class="btn btn-default btn-sm"><i class="fa fa-times"></i></button>' +
        '<strong>' + (message ? title : 'Warning') + '</strong> ' + (message ? message : title) + '</div>'
      )
    );
  }
})();
