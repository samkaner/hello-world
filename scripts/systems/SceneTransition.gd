extends CanvasLayer
## Simple fade-to-black scene transition, used instead of hand-authoring a
## separate transition scene.

var _fade_rect: ColorRect


func _ready() -> void:
	layer = 100
	process_mode = Node.PROCESS_MODE_ALWAYS
	_fade_rect = ColorRect.new()
	_fade_rect.color = Color.BLACK
	_fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fade_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_fade_rect.modulate.a = 0.0
	add_child(_fade_rect)


func goto_scene(path: String) -> void:
	get_tree().paused = false
	var fade_out := create_tween()
	fade_out.tween_property(_fade_rect, "modulate:a", 1.0, 0.25)
	await fade_out.finished
	get_tree().change_scene_to_file(path)
	await get_tree().process_frame
	var fade_in := create_tween()
	fade_in.tween_property(_fade_rect, "modulate:a", 0.0, 0.25)
