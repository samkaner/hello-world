extends LevelBase
## Mini-boss level: a short gauntlet leading to Big Yawn's arena.

const BONK_BUG_SCENE := preload("res://scenes/entities/enemies/BonkBug.tscn")
const BIG_YAWN_SCENE := preload("res://scenes/entities/bosses/BigYawn.tscn")


func _build_level() -> void:
	setup_parallax_background("snoring_stump")
	set_camera_bounds(Rect2(0, 0, 900, 270))

	build_floor([
		Rect2(0, 220, 900, 60),
	])
	spawn_kill_zone(Rect2(0, 300, 900, 40))

	var bug := BONK_BUG_SCENE.instantiate()
	bug.position = Vector2(300, 200)
	add_child(bug)

	var boss := BIG_YAWN_SCENE.instantiate()
	boss.position = Vector2(800, 188)
	add_child(boss)
	boss.defeated.connect(GameManager.complete_level)

	spawn_boss_arena(Rect2(620, 150, 40, 100), boss)
