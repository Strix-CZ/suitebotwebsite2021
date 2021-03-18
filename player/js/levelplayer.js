var levelplayer = (function() {

	var GAMES_PER_LEVEL = 3;
	var GAME_NUMBER = 0;
	var PLAYING_LEVEL = false;

	function initialize() {
		$('#level_number_container').text(get_level());
		gameplayer.load_gamelog_and_initialize(get_gamelog_file(1));
	    show_message('Level ' + get_level());
	}

	function play_level() {
		if (!PLAYING_LEVEL) {
			PLAYING_LEVEL = true;
	        play_next_game();
        }
	}

	function play_next_game() {
        update_game_number(GAME_NUMBER + 1);

        if (GAME_NUMBER > GAMES_PER_LEVEL)
        {
		    show_message('Game Over');
            return;
        }

        when_gamelog_is_available(function() {
	        show_message('Game ' + GAME_NUMBER);
			gameplayer.load_gamelog_and_initialize(get_gamelog_file(GAME_NUMBER));

	        setTimeout(function() {
	            hide_message();
	            gameplayer.autoreplay.set_on_finish(play_next_game);
				gameplayer.autoreplay.start();
	        }, 2000);
        });
	}

	function when_gamelog_is_available(execute) {
		var waited_seconds = 0;

		function test_if_gamelog_is_available() {
			$.ajax(get_gamelog_file(GAME_NUMBER))
				.done(function() {
					execute();
				})
				.fail(function() {
					show_message('Waiting... ' + waited_seconds);
					waited_seconds++;
					setTimeout(test_if_gamelog_is_available, 1000);
				});
		}

		test_if_gamelog_is_available();
	}

	function get_gamelog_file(game_number) {
		return "gamelogs/level" + get_level() + "/game" + game_number + ".json";
	}

	function update_game_number(game_number) {
		GAME_NUMBER = game_number;
		$('#game_number_container').text(GAME_NUMBER);
	}

	function get_level() {
		return getUrlParameter('level') || 1;
	}

	function show_message(message) {
		$('#game_message').show().text(message);
	}

	function hide_message(message) {
		$('#game_message').hide();
	}

	return {
		initialize: initialize,
		play_level: play_level
	}

}());