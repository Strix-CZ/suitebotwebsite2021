var levelresults = (function() {

    var DEBUG = false;
    var GAMES_PER_LEVEL = 3;

    function generate() {
        update_headers();

        retrieve_level_data(get_level(), function(level_data) {
            if (level_data.length == 0)
                return;

            var level_results = make_level_results_from_level_data(level_data, get_level());
            level_results.forEach(function(players_level_results, i) {
                var players_level_results_row = $('<tr></tr>');

                players_level_results_row.append($('<th></th>').text(i + 1));
                players_level_results_row.append($('<td></td>').text(players_level_results.playerName));
                players_level_results.gameResults.forEach(function(players_game_result) {
                    players_level_results_row.append($('<td></td>').addClass('right').text(players_game_result.survived));
                    players_level_results_row.append($('<td></td>').addClass('right').text(players_game_result.score));
                });
                for (var j = players_level_results.gameResults.length; j < GAMES_PER_LEVEL; j++) {
                    players_level_results_row.append($('<td></td>').addClass('right').text(' '));
                    players_level_results_row.append($('<td></td>').addClass('right').text(' '));
                }
                players_level_results_row.append($('<th></th>').addClass('right').text(players_level_results.totalScore));

                $('#level-results').append(players_level_results_row);
            });

            add_levelreplay_link();
            add_gamereplay_links(level_data.length);

            if (DEBUG)
                $('#debug').text(JSON.stringify(level_results, null, '    '));
        });
    }

    function retrieve_level_data(level, done_callback) {
        var level_data = [];

        function retrieve_level_data_internal() {
            var game_number_to_retrieve = level_data.length + 1;

            $.getJSON("player/gamelogs/level" + level + "/game" + game_number_to_retrieve + ".json", function(data) {
                level_data.push(data);
                retrieve_level_data_internal();
            })
                .error(function() {
                    done_callback(level_data);
                });
        }

        retrieve_level_data_internal();
    }

	function make_level_results_from_level_data(level_data, level) {
        if (level_data.length == 0)
            return;

        var game_results_list = [];
        level_data.forEach(function(game_data) {
            game_results_list.push(make_game_results(game_data, level));
        });

        return make_level_results(game_results_list, level_data[0].players);
    }

    function make_level_results(game_results_list, player_list) {
        var level_results = [];

        player_list.forEach(function(player) {
            var player_results = make_player_results(player.id, game_results_list);

            level_results.push({
                playerId: player.id,
                playerName: player.name,
                gameResults: player_results,
                totalSurvived: sum_survived(player_results),
                totalScore: sum_score(player_results)
            });
        });

        level_results.sort(function (x, y) { return y.totalScore - x.totalScore; });
        return level_results;
    }

    function make_game_results(game_data, level) {
        var moves_by_player = {};
        var killed_player = {};
        game_data.players.forEach(function(player) {
            moves_by_player[player.id] = 0;
            killed_player[player.id] = false;
        });

        game_data.rounds.forEach(function(round) {
            round.killedPlayerIds.forEach(function(player_id) {
                killed_player[player_id] = true;
            });

            game_data.players.forEach(function(player) {
                if (!killed_player[player.id])
                    moves_by_player[player.id]++;
            });
        });

        var game_results = [];
        game_data.players.forEach(function(player) {
            game_results.push({
                playerId: player.id,
                playerName: player.name,
                survived: moves_by_player[player.id],
                score: get_score(moves_by_player[player.id], level)
            });
        });
        return game_results;
    }

    function make_player_results(player_id, game_results_list) {
        var player_results = [];

        game_results_list.forEach(function(game_results) {
            game_results.forEach(function(players_game_results) {
                if (players_game_results.playerId == player_id) {
                    player_results.push({
                        survived: players_game_results.survived,
                        score: players_game_results.score
                    });
                }
            })
        });

        return player_results;
    }

    function sum_survived(player_results) {
        var sum = 0;
        player_results.forEach(function(result) { sum += result.survived; });
        return sum;
    }

    function sum_score(player_results) {
        var sum = 0;
        player_results.forEach(function(result) { sum += result.score; });
        return sum;
    }

    function get_score(moves_survived, level) {
        var multipliers = [10, 13, 16, 20, 25, 32, 40];
        return moves_survived * multipliers[level - 1];
    }

    function get_level() {
        return getUrlParameter('id') || 1;
    }

    function update_headers() {
        var title = $('title');
        title.text(title.text() + ' ' + get_level());

        var h1 = $('h1');
        h1.text(h1.text() + ' ' + get_level());
    }

    function add_levelreplay_link() {
        var level_replay_element = $('#level-replay-link');
        var text = level_replay_element.text();

        level_replay_element.text('').append(
            $('<a></a>')
                .attr('href', 'player/playlevel.html?level=' + get_level())
                .text(text)
        );
    }

    function add_gamereplay_links(count) {
        for (var i = 1; i <= count; i++)
        {
            var game_heading_element = $('#game-' + i);
            var text = game_heading_element.text();

            game_heading_element.text('').append(
                $('<a></a>')
                    .attr('href', 'player/playgame.html?level=' + get_level() + '&game=' + i)
                    .text(text)
            );
        }
    }

    return {
        generate: generate,
        retrieve_level_data: retrieve_level_data,
        make_level_results_from_level_data: make_level_results_from_level_data,
        games_per_level: GAMES_PER_LEVEL
    }

}());