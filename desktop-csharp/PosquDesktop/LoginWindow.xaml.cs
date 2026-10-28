using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;
using PosquDesktop.ViewModels;

namespace PosquDesktop;

public partial class LoginWindow : Window
{
    public LoginWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
        RootCard.MouseLeftButtonDown += OnRootCardMouseLeftButtonDown;
    }

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        if (DataContext is LoginViewModel vm)
        {
            PasswordInput.Password = vm.Password ?? string.Empty;
            vm.Password = PasswordInput.Password;
        }

        FocusManager.SetFocusedElement(this, EmailInput);
        EmailInput.Focus();
        Keyboard.Focus(EmailInput);
        if (DataContext is LoginViewModel vm2 && !string.IsNullOrWhiteSpace(vm2.Email))
            EmailInput.SelectAll();
    }

    private void OnRootCardMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ButtonState != MouseButtonState.Pressed) return;
        if (e.OriginalSource is DependencyObject source && IsInteractive(source)) return;

        try { DragMove(); }
        catch { }
    }

    private static bool IsInteractive(DependencyObject source)
    {
        for (DependencyObject? current = source; current != null; current = LogicalTreeHelper.GetParent(current) ?? VisualTreeHelper.GetParent(current))
        {
            if (current is TextBox or PasswordBox or ButtonBase or ComboBox or CheckBox or ToggleButton)
                return true;
        }
        return false;
    }

    private void PasswordInput_PasswordChanged(object sender, RoutedEventArgs e)
    {
        if (DataContext is LoginViewModel vm)
            vm.Password = PasswordInput.Password ?? string.Empty;
    }

    private void LoginButton_Click(object sender, RoutedEventArgs e)
    {
        if (DataContext is LoginViewModel vm)
            vm.Password = PasswordInput.Password ?? string.Empty;
    }

    private void Close_Click(object sender, RoutedEventArgs e) => Close();
}
