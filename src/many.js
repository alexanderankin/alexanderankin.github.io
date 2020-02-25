(function () {
  var data = {
    candidates: null,
    contests: null,
    precincts: null,
    countingGroups: null,
    ballotTypes: null,
    cvrData: null
  };

  function attachFileInputDrag() {
    $('button.drag-input-button').on('click', e => {
      e.preventDefault();
      var id = $(e.target).data('drag-for-file-input')
      document.getElementById(id).click();
    });

    $('.file-input').on('change', async e => {
      var file = e.originalEvent.target.files[0];
      if (!file)
        return;

      console.log(file);
    });
    // $('#file-input').on('dragover', e => { e.preventDefault(); $('#file-input').addClass('ready-input'); });
    // $('#file-input').on('dragexit', e => { e.preventDefault(); $('#file-input').removeClass('ready-input'); });
    // $('#file-input').on('dragstart', e => {
    //   e.preventDefault();
    // });
    // $('#file-input').on('drop', e => {
    //   e.preventDefault();
    //   document.getElementById('file-input-file-input').files = e.originalEvent.dataTransfer.files;
    // });

    // // $('file-input-file-input').on('click', e => {
    // //   e.target.value = null;
    // // });
    // $('#file-input-file-input').on('change', e => {
    //   updateFiles();
    // });
  }

  function updateFiles() {
    var files = document.getElementById('file-input-file-input').files;
    var el = $('#files');
    el.html('<button type="button" onclick="document.getElementById(\'fileform\').reset(); ' +
      '$(\'#files\').html(\'\');" ' +
      'class="mb-3 btn btn-sm btn-link">Clear</button>');

    function append(name, error) {
      el.append($(
        '<div class="alert alert-' + (error ? 'danger' : 'light') + '" role="alert">' +
          '<i class="fa fa-file"></i> ' + name +
        '</div>'
        )
      )
    }

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (/json/.test(file.type)) {
        append(file.name);
      } else {
        append(file.name, true);
      }
    }
  }
  // window.updateFiles = updateFiles;

  function addError(title, message) {
    $('#errors').append($(
        '<div class="alert alert-danger" role="alert">' + 
        '<button type="button" onclick="this.parentElement.remove()" class="btn btn-default btn-sm"><i class="fa fa-times"></i></button>' +
        '<strong>' + (message ? title : 'Warning') + '</strong> ' + (message ? message : title) + '</div>'
      )
    );
  }

  async function parseFile(file) {
    return new Promise((resolve, reject) => {
      var reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(JSON.parse(reader.result));
      reader.readAsBinaryString(file);
    });
  }

  /**
   *
   * let candidates = parseManifest( './CandidateManifest.json' ),
   *   contests = parseManifest( './ContestManifest.json' ),
   *   precincts = parseManifest( './PrecinctPortionManifest.json' ),
   *   countingGroups = parseManifest( './CountingGroupManifest.json' ),
   *   ballotTypes = parseManifest( './BallotTypeManifest.json' ),
   *   cvrData = JSON.parse( fs.readFileSync( './CvrExport.json', { encoding: 'utf-8' } ) );
   */
  function convertObj({candidates, contests, precincts, countingGroups, ballotTypes, cvrData}) {
    return convert(candidates, contests, precincts, countingGroups, ballotTypes, cvrData);
  }
  function convert(candidates, contests, precincts, countingGroups, ballotTypes, cvrData) {
    function parseManifest( data ) {
      data = JSON.parse(data);
      var map = {};
      for ( let entry of data.List ) {
        map[ entry.Id ] = entry.Description;
      }
      return map;
    }

    candidates = JSON.parse(candidates);
    contests = JSON.parse(contests);
    precincts = JSON.parse(precincts);
    countingGroups = JSON.parse(countingGroups);
    ballotTypes = JSON.parse(ballotTypes);
    cvrData = JSON.parse(cvrData);

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

    console.log({candidates, contests, precincts, countingGroups, ballotTypes, cvrData});
    return null;
    return cvrData.Sessions.map( function ( session ) {
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

  // window.doCVRConversion = 

  function attachFileOutput() {
    $('#file-output').on('click', async e => {
      console.log(await parseFiles());
      return;
      try {
        var contents = convertObj(await parseFiles());
        var save = document.createElement('a');
        save.href = 'data:application/json;charset=utf-8,' + JSON.stringify({a: true});
        save.download = 'filename.json';
      } catch (e) {
        addError(e.message);
        throw e;
      }
    });  
  }

  $(() => {
    // attachShowHideClick();
    // attachSearchForFnSubmit();
    attachFileInputDrag();
    // attachFileOutput();
  });
})();
