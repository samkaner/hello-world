extends LevelBase
## Final level: a top-down approach corridor (with two Twiglets), a
## platforming climb up a short staircase of platforms, and Grumbleroot's
## arena at the top.

const TWIGLET_SCENE := preload("res://scenes/entities/enemies/Twiglet.tscn")
const GRUMBLEROOT_SCENE := preload("res://scenes/entities/bosses/Grumbleroot.tscn")


func _build_level() -> void:
	setup_parallax_background("bramble_tower")
	set_camera_bounds(Rect2(0, 0, 1400, 270))

	# Approach corridor (top-down).
	build_walls([
		Rect2(0, 0, 480, 16),
		Rect2(0, 254, 480, 16),
		Rect2(0, 0, 16, 270),
	])
	spawn_platform_mode_zone(Rect2(470, 0, 20, 270))

	_spawn_twiglet(Vector2(200, 100))
	_spawn_twiglet(Vector2(200, 200))

	# Climb (platforming).
	build_floor([
		Rect2(480, 220, 120, 50),
		Rect2(620, 190, 90, 20),
		Rect2(730, 160, 90, 20),
		Rect2(840, 130, 90, 20),
		Rect2(950, 100, 400, 20),
	])
	spawn_kill_zone(Rect2(480, 260, 900, 40))

	var boss := GRUMBLEROOT_SCENE.instantiate()
	boss.position = Vector2(1250, 70)
	add_child(boss)
	boss.defeated.connect(GameManager.complete_level)

	spawn_boss_arena(Rect2(1000, 30, 40, 70), boss)


func _spawn_twiglet(pos: Vector2) -> void:
	var twiglet := TWIGLET_SCENE.instantiate()
	twiglet.position = pos
	add_child(twiglet)
