/**
 * Created by jpomikalek on 11/10/2015.
 */

var gameplayer = (function() {

    var GAMEPLAN_CONTAINER_ID = '#gameplan_container';
    var PLAYERLIST_CONTAINER_ID = '#playerlist_container';
    var ROUND_CONTAINER_ID = '#round_container';

    // template (overwritten from a loaded JSON file)
    var GAME_LOG = {
        gamePlan: {
            width: 12,
            height: 12,
            startingPositions: [
                {x: 11, y: 5},
                {x: 11, y: 3}
            ],
            walls : [
                {x: 0, y: 0}
            ]
        },
        players: [
            {
                // TODO: add color?
                id: 1,
                name: "Player 1",
                version: "1.0"
            },
            {
                id: 2,
                name: "Player 2",
                version: "2.0"
            }
        ],
        rounds: [
            {
                moves: [
                    {
                        playerId: 1,
                        move: "UL"
                    },
                    {
                        playerId: 2,
                        move: "D"
                    }
                ],
                crashPositions: [
                    {x: 11, y: 4}
                ],
                killedPlayerIds: [1, 2],
                idsOfPlayersKilledAfterFirstStep: [1, 2]
            }
        ]
    };

    var SOUND_ON = true;
    var ROUND_NUMBER = 0;
    var PLAYER_HEADS;
    var LIVE_PLAYERS = {};
    var PLAYER_COLORS = {
        1: 'red',
        2: 'fuchsia',
        3: 'green',
        4: 'olive',
        5: 'yellow',
        6: 'teal',
        7: 'lime',
        8: 'aqua',
        9: 'white'
    };

    function get_cell_id(x, y) {
        return 'cell-' + x + '-' + y;
    }

    function get_cell(x, y) {
        return $('#' + get_cell_id(x, y));
    }

    function get_player_tr_id(player_id) {
        return 'player-' + player_id;
    }

    function get_player_tr(player_id) {
        return $('#' + get_player_tr_id(player_id));
    }

    function get_player_name_td(player_id) {
        return get_player_tr(player_id).find('.player_name');
    }

    function get_player_score_td(player_id) {
        return get_player_tr(player_id).find('.player_score');
    }

    function is_wall(x, y) {
        var found_wall = false;

        GAME_LOG.gamePlan.walls.forEach(function(point) {
            if (point.x == x && point.y == y)
                found_wall = true;
        });

        return found_wall;
    }

    function set_wall(x, y) {
        get_cell(x, y).removeClass().addClass("wall");
    }

    function set_player(player_id, x, y) {
        get_cell(x, y).css('background-color', get_player_color(player_id));
    }

    function set_player_head(player_id, x, y) {
        get_cell(x, y).css('color', 'black').text('O');
    }

    function unset_player_head(player_id, x, y) {
        get_cell(x, y).css('color', '').text('');
    }

    function set_player_transition(player_id, source, direction) {
        var source_transition_edge;
        var target_transition_edge;

        if (direction == 'L') {
            source_transition_edge = 'left';
            target_transition_edge = 'right';
        }
        else if (direction == 'R') {
            source_transition_edge = 'right';
            target_transition_edge = 'left';
        }
        else if (direction == 'U') {
            source_transition_edge = 'top';
            target_transition_edge = 'bottom';
        }
        else if (direction == 'D') {
            source_transition_edge = 'bottom';
            target_transition_edge = 'top';
        }
        else {
            return;
        }

        var target = get_neighbor_position(source, direction);
        var color = get_player_color(player_id);
        get_cell(source.x, source.y).css('border-' + source_transition_edge + '-color', color);
        get_cell(target.x, target.y).css('border-' + target_transition_edge + '-color', color);
    }

    function set_crash(x, y) {
        get_cell(x, y).css('background-color', '#222').css('color', 'red').text('X');

        if (SOUND_ON)
            $('#crash_sound').trigger('play');
    }

    function reset_cell(x, y) {
        get_cell(x, y)
            .removeClass()
            .css('background-color', '')
            .css('color', '')
            .css('border-left-color', '')
            .css('border-right-color', '')
            .css('border-top-color', '')
            .css('border-bottom-color', '')
            .text('');
    }

    function set_player_killed(player_id) {
        get_player_name_td(player_id).addClass("killed");
        LIVE_PLAYERS[player_id] = false;
    }

    function set_player_live(player_id) {
        get_player_name_td(player_id).removeClass("killed");
        LIVE_PLAYERS[player_id] = true;
    }

    function get_player_color(player_id) {
        return PLAYER_COLORS[player_id];
    }

    function load_gamelog_and_initialize(gamelog) {
        $.getJSON(gamelog, function (data) {
            GAME_LOG = data;
            initialize();
        });
    }

    function initialize() {
        cleanup_containers();
        render_gameplan();
        render_player_list();
        reset_game();
    }

    function cleanup_containers() {
        $(GAMEPLAN_CONTAINER_ID).empty();
        $(PLAYERLIST_CONTAINER_ID).empty();
    }

    function render_gameplan() {
        var table = $('<table></table>').attr('id', 'gameplan');
        for (var y = 0; y < GAME_LOG.gamePlan.height; y++) {
            var row = $('<tr></tr>');
            for (var x = 0; x < GAME_LOG.gamePlan.width; x++) {
                var cell = $('<td></td>').attr('id', get_cell_id(x, y)).text(' ');
                row.append(cell);
            }
            table.append(row);
        }
        $(GAMEPLAN_CONTAINER_ID).append(table);
    }

    function add_walls() {
        for (var y = 0; y < GAME_LOG.gamePlan.height; y++) {
            for (var x = 0; x < GAME_LOG.gamePlan.width; x++) {
                if (is_wall(x, y))
                    set_wall(x, y);
            }
        }
    }

    function wipeout_gameplan() {
        for (var y = -1; y <= GAME_LOG.gamePlan.height; y++) {
            for (var x = -1; x <= GAME_LOG.gamePlan.width; x++) {
                reset_cell(x, y);
            }
        }
    }

    function add_starting_positions() {
        PLAYER_HEADS = {};
        GAME_LOG.gamePlan.startingPositions.forEach(function(position, i) {
            var playerId = GAME_LOG.players[i].id;
            PLAYER_HEADS[playerId] = position;
            set_player(playerId, position.x, position.y);
            set_player_head(playerId, position.x, position.y);
        });
    }

    function render_player_list() {
        var table = $('<table></table>').attr('id', 'playerlist');
        var header_tr = $('<tr></tr>');
        table.append(header_tr);
        header_tr
            .append($('<th></th>'))
            .append($('<th></th>').text('Team'))
            .append($('<th></th>').text('Survived'));

        GAME_LOG.players.forEach(function(player) {
            var player_color_td = $('<td></td>')
                .addClass('player_color')
                .css('background-color', get_player_color(player.id))
                .text('');

            var player_name_td = $('<td></td>')
                .addClass('player_name')
                .css('color', get_player_color(player.id))
                .text(player.name + " v" + player.version);

            var player_score_td = $('<td></td>')
                .addClass('player_score')
                .text('0');

            var tr = $('<tr></tr>').attr('id', get_player_tr_id(player.id))
                .append(player_color_td)
                .append(player_name_td)
                .append(player_score_td);

            table.append(tr);
        });

        $(PLAYERLIST_CONTAINER_ID).append(table);
    }

    function update_score() {
		$.each(LIVE_PLAYERS, function(player_id, is_live) {
			if (is_live)
				get_player_score_td(player_id).text(ROUND_NUMBER);
		});
    }

    function is_game_over() {
        return ROUND_NUMBER >= GAME_LOG.rounds.length;
    }

    function get_round_number() {
        return ROUND_NUMBER;
    }

    function get_round_label() {
        if (ROUND_NUMBER <= 0)
            return "Start";
        else
            return "Round " + ROUND_NUMBER;
    }

    function set_round_number(round_number) {
        ROUND_NUMBER = round_number;
        $(ROUND_CONTAINER_ID).text(get_round_label());
    }

    function get_round() {
        return GAME_LOG.rounds[ROUND_NUMBER - 1];
    }

    function get_head_position(player_id) {
        return PLAYER_HEADS[player_id];
    }

    function get_neighbor_position(from, direction) {
        var x = from.x;
        var y = from.y;

        if      (direction == 'U') y--;
        else if (direction == 'D') y++;
        else if (direction == 'L') x--;
        else if (direction == 'R') x++;
        else return null;

        return {
            x: (x + GAME_LOG.gamePlan.width) % GAME_LOG.gamePlan.width,
            y: (y + GAME_LOG.gamePlan.height) % GAME_LOG.gamePlan.height
        }
    }

    function move_head(player_id, direction) {
        var old_head = PLAYER_HEADS[player_id];
        var new_head = get_neighbor_position(old_head, direction);

        unset_player_head(player_id, old_head.x, old_head.y);

        PLAYER_HEADS[player_id] = new_head;
        set_player_head(player_id, new_head.x, new_head.y);
        set_player(player_id, new_head.x, new_head.y);

        set_player_transition(player_id, old_head, direction);
    }

    function play_round() {
        if (is_game_over())
            return;

        set_round_number(get_round_number() + 1);

        get_round().moves.forEach(function(player_move) {
            play_move(player_move.playerId, player_move.move);
        });

        get_round().crashPositions.forEach(function(crash_position) {
            set_crash(crash_position.x, crash_position.y);
        });

        get_round().killedPlayerIds.forEach(function(killed_player) {
            set_player_killed(killed_player);
        });

        update_score();

        $('#debug').text(JSON.stringify(get_round(), null, 2));
    }

    function play_rounds(count) {
        for (var i = 0; i < count; i++)
            silently(play_round);
    }

    function play_move(player_id, move) {
        play_step(player_id, move[0]);

        if (move.length >= 2 && !was_player_killed_after_first_step(player_id))
            play_step(player_id, move[1]);
    }

    function play_step(player_id, step) {
        if (step)
            move_head(player_id, step);
    }

    function was_player_killed_after_first_step(player_id) {
        return ($.inArray(player_id, get_round().idsOfPlayersKilledAfterFirstStep) != -1);
    }

    function silently(executable) {
        SOUND_ON = false;
        executable();
        SOUND_ON = true;
    }

    function play_all_rounds() {
        while (!is_game_over())
            silently(play_round);
    }

    function undo_round() {
        undo_rounds(1);
    }

    function undo_rounds(count) {
        var prev_round = get_round_number() - count;

        reset_game();

        for (var i = 0; i < prev_round; i++)
            silently(play_round);
    }

    function reset_game() {
        set_round_number(0);
        wipeout_gameplan();
        add_walls();
        add_starting_positions();

        GAME_LOG.players.forEach(function(player) {
            set_player_live(player.id);
        });

        update_score();
    }

    function init_header() {
        $('#level_number_container').text(get_level());
        $('#game_number_container').text(get_game());
    }

    function get_gamelog_path() {
        return "gamelogs/level" + get_level() + "/game" + get_game() + ".json";
    }

    function get_level() {
        return getUrlParameter('level') || 1;
    }

    function get_game() {
        return getUrlParameter('game') || 1;
    }

    var autoreplay = (function() {
        var ON_FINISH = null;
        var STARTED = false;
        var PAUSED = false
        var TIMER;

        function start() {
            if (STARTED)
                return;

	        $('#game_music').prop('currentTime', 0).prop('volume', 1).trigger('play');
	        PAUSED = false;

	        TIMER = window.setInterval(function() {
	            if (!PAUSED)
	                play_round();

	            if (is_game_over())
	                stop();
	        }, 300);

	        STARTED = true;
        }

        function stop() {
            if (!STARTED)
                return;

            window.clearInterval(TIMER);
            STARTED = false;
            $('#game_music').animate({volume: 0}, 2000);

            if (ON_FINISH)
                setTimeout(ON_FINISH, 2000);
        }

        function play_or_pause() {
            if (!STARTED) {
                start();
            }
            else {
		        if (PAUSED) {
		            $('#game_music').trigger('play');
		            PAUSED = false;
		        } else {
		            $('#game_music').trigger('pause');
		            PAUSED = true;
		        }
            }
        }

        function set_on_finish(on_finish) {
            ON_FINISH = on_finish;
        }

        return {
            start: start,
            stop: stop,
            play_or_pause: play_or_pause,
            set_on_finish: set_on_finish
        }
    })();

    return {
        load_gamelog_and_initialize: load_gamelog_and_initialize,
        get_gamelog_path: get_gamelog_path,
        init_header: init_header,
        initialize: initialize,
        play_round: play_round,
        play_rounds: play_rounds,
        play_all_rounds: play_all_rounds,
        undo_round: undo_round,
        undo_rounds: undo_rounds,
        reset_game: reset_game,
        autoreplay: autoreplay
    }

})();
