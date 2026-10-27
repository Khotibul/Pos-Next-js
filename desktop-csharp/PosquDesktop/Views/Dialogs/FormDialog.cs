using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace PosquDesktop.Views.Dialogs;

public sealed class FormOption
{
    public string Value { get; }
    public string Label { get; }
    public FormOption(string value, string label) { Value = value; Label = label; }
    public override string ToString() => Label;
}

public sealed class FormField
{
    public required string Key { get; init; }
    public required string Label { get; init; }
    public string? Value { get; init; }
    public bool Required { get; init; }
    public bool Multiline { get; init; }
    public bool Password { get; init; }
    public IReadOnlyList<FormOption>? Options { get; init; }
}

public sealed class FormDialog : Window
{
    private readonly List<(FormField Field, Control Input)> _controls = new();
    private readonly TextBlock _error;

    public Dictionary<string, string> Values { get; } = new();

    public FormDialog(string title, string? subtitle, IReadOnlyList<FormField> fields, string okText = "Simpan")
    {
        Title = title;
        Width = 470;
        SizeToContent = SizeToContent.Height;
        MaxHeight = 720;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        ResizeMode = ResizeMode.NoResize;
        Background = (Brush)FindResource("SurfaceBrush");
        FontFamily = new FontFamily("Segoe UI");

        var root = new DockPanel { Margin = new Thickness(24) };

        var header = new StackPanel { Margin = new Thickness(0, 0, 0, 16) };
        header.Children.Add(new TextBlock
        {
            Text = title,
            FontSize = 20,
            FontWeight = FontWeights.SemiBold,
            Foreground = (Brush)FindResource("TextPrimaryBrush")
        });
        if (!string.IsNullOrWhiteSpace(subtitle))
        {
            header.Children.Add(new TextBlock
            {
                Text = subtitle,
                FontSize = 12,
                Margin = new Thickness(0, 4, 0, 0),
                Foreground = (Brush)FindResource("TextMutedBrush"),
                TextWrapping = TextWrapping.Wrap
            });
        }
        DockPanel.SetDock(header, Dock.Top);
        root.Children.Add(header);

        _error = new TextBlock
        {
            Foreground = (Brush)FindResource("DangerBrush"),
            FontSize = 12,
            TextWrapping = TextWrapping.Wrap,
            Margin = new Thickness(0, 8, 0, 0),
            Visibility = Visibility.Collapsed
        };
        DockPanel.SetDock(_error, Dock.Bottom);
        root.Children.Add(_error);

        var buttons = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            HorizontalAlignment = HorizontalAlignment.Right,
            Margin = new Thickness(0, 16, 0, 0)
        };
        var cancel = new Button
        {
            Content = "Batal",
            Style = (Style)FindResource("SecondaryButton"),
            MinWidth = 92,
            Margin = new Thickness(0, 0, 8, 0),
            IsCancel = true
        };
        var ok = new Button
        {
            Content = okText,
            Style = (Style)FindResource("PrimaryButton"),
            MinWidth = 110,
            IsDefault = true
        };
        ok.Click += (_, _) => Accept();
        buttons.Children.Add(cancel);
        buttons.Children.Add(ok);
        DockPanel.SetDock(buttons, Dock.Bottom);
        root.Children.Add(buttons);

        var scroll = new ScrollViewer
        {
            VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
            MaxHeight = 520
        };
        var form = new StackPanel();
        foreach (var field in fields)
            AddField(form, field);
        scroll.Content = form;
        root.Children.Add(scroll);

        Content = root;
    }

    private void AddField(Panel panel, FormField field)
    {
        panel.Children.Add(new TextBlock
        {
            Text = field.Label + (field.Required ? " *" : ""),
            FontSize = 12,
            FontWeight = FontWeights.SemiBold,
            Foreground = (Brush)FindResource("TextSecondaryBrush"),
            Margin = new Thickness(0, 0, 0, 6)
        });

        Control input;
        if (field.Options is { Count: > 0 })
        {
            var combo = new ComboBox { Style = (Style)FindResource("InputCombo") };
            foreach (var option in field.Options)
                combo.Items.Add(option);
            combo.SelectedIndex = 0;
            for (var i = 0; i < field.Options.Count; i++)
            {
                if (string.Equals(field.Options[i].Value, field.Value, StringComparison.OrdinalIgnoreCase))
                {
                    combo.SelectedIndex = i;
                    break;
                }
            }
            input = combo;
        }
        else
        {
            var textBox = new TextBox
            {
                Text = field.Value ?? "",
                Style = (Style)FindResource("InputTextBox"),
                AcceptsReturn = field.Multiline,
                TextWrapping = field.Multiline ? TextWrapping.Wrap : TextWrapping.NoWrap,
                Height = field.Multiline ? 84 : double.NaN,
                VerticalContentAlignment = field.Multiline ? VerticalAlignment.Top : VerticalAlignment.Center
            };
            input = textBox;
        }

        input.Margin = new Thickness(0, 0, 0, 14);
        input.Tag = field;
        _controls.Add((field, input));
        panel.Children.Add(input);
    }

    private void Accept()
    {
        Values.Clear();
        foreach (var (field, input) in _controls)
        {
            string value;
            if (input is ComboBox combo)
                value = (combo.SelectedItem as FormOption)?.Value ?? "";
            else
                value = ((TextBox)input).Text.Trim();

            if (field.Required && string.IsNullOrWhiteSpace(value))
            {
                _error.Text = $"Kolom “{field.Label}” wajib diisi.";
                _error.Visibility = Visibility.Visible;
                input.Focus();
                return;
            }
            Values[field.Key] = value;
        }
        DialogResult = true;
    }

    public static Dictionary<string, string>? Show(
        Window? owner,
        string title,
        string? subtitle,
        IReadOnlyList<FormField> fields,
        string okText = "Simpan")
    {
        var dialog = new FormDialog(title, subtitle, fields, okText);
        if (owner != null && owner.IsVisible) dialog.Owner = owner;
        return dialog.ShowDialog() == true ? dialog.Values : null;
    }
}
