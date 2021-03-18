var standings = (function() {

	var TOTAL_LEVELS = 7;

    function generate() {
        retrieve_all_level_data(function(all_level_data) {
            var standings = make_standings(all_level_data);

            standings.forEach(function(player_results, i) {
                var player_results_row = $('<tr></tr>');

                player_results_row.append($('<th></th>').text(i + 1));
                player_results_row.append($('<td></td>').text(player_results.playerName));
                player_results.levelScores.forEach(function(level_score) {
                    player_results_row.append($('<td></td>').addClass('right').text(level_score));
                });
                for (var j = player_results.levelScores.length; j < TOTAL_LEVELS; j++) {
                    player_results_row.append($('<td></td>').addClass('right').text(' '));
                }
                player_results_row.append($('<th></th>').addClass('right').text(player_results.totalScore));

                $('#standings').append(player_results_row);
            });
        });
    }

    function retrieve_all_level_data(done_callback) {
        var all_level_data = [];

        function retrieve_all_level_data_internal() {
            levelresults.retrieve_level_data(all_level_data.length + 1, function(level_data) {
                if (level_data.length > 0)
                    all_level_data.push(level_data);

                if (level_data.length >= levelresults.games_per_level)
                    retrieve_all_level_data_internal();
                else
                    done_callback(all_level_data);
            });
        }

        retrieve_all_level_data_internal();
    }

    function make_standings(all_level_data) {
        if (all_level_data.length == 0)
            return [];

		var all_level_results = [];
		all_level_data.forEach(function(level_data, i) {
			all_level_results.push(levelresults.make_level_results_from_level_data(level_data, i + 1));
		});

		var standings = [];

		all_level_data[0][0].players.forEach(function(player) {
			var level_scores = [];
			var total_score = 0;

			all_level_results.forEach(function(level_results) {
				players_level_results = find_players_results(player.id, level_results);
				level_scores.push(players_level_results.totalScore);
				total_score += players_level_results.totalScore;
			});

			standings.push({
				playerId: player.id,
				playerName: player.name,
				levelScores: level_scores,
				totalScore: total_score
			});
		});

		standings.sort(function(x, y) { return y.totalScore - x.totalScore; });
		return standings;
    }

    function find_players_results(player_id, level_results) {
        var players_results = null;

        level_results.forEach(function(players_level_results) {
            if (players_level_results.playerId == player_id)
                players_results = players_level_results;
        });

        return players_results;
    }

    return {
        generate: generate
    }

})();