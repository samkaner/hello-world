extends LevelBase
## Platforming level with a bounce pad that launches the player up to a
## hidden top-down alcove (a bonus heal, entirely optional) before
## continuing on to a mid-level checkpoint and the goal.

const BONK_BUG_SCENE := preload("res://scenes/entities/enemies/BonkBug.tscn")


func _build_level() -> void:
	setup_parallax_background("fizzy_falls")
	set_camera_bounds(Rect2(0, 0, 1400, 270))

	build_floor([
		Rect2(0, 220, 1400, 60),
	])
	PlatformBuilder.build_platforms(self, [
		Rect2(460, 120, 140, 20),
		# Level-edge walls so nobody strolls off the map.
		Rect2(-16, 0, 16, 270),
		Rect2(1400, 0, 16, 270),
	], ground_texture)

	# Bounce pad sits beside the platform (not under it, or the player just
	# bonks its underside); the launch apex lands inside the top-down zone,
	# which covers the flight path and the alcove above the platform.
	spawn_bounce_pad(Rect2(620, 205, 60, 14))
	spawn_top_down_zone(Rect2(460, 80, 220, 50))
	spawn_heal_pickup(Rect2(518, 98, 24, 24))

	spawn_checkpoint(Rect2(740, 190, 20, 30))
	spawn_kill_zone(Rect2(0, 300, 1400, 40))
	spawn_goal(Rect2(1330, 150, 50, 70))

	var bug := BONK_BUG_SCENE.instantiate()
	bug.position = Vector2(900, 200)
	add_child(bug)
