using System.Windows;
using System.Windows.Input;
using PosquDesktop.ViewModels;

namespace PosquDesktop;

public partial class LoginWindow : Window
{
    public LoginWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
        MouseLeftButtonDown += (_, e) =>
        {
            if (e.ButtonState == MouseButtonState.Pressed) DragMove();
        };
    }

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        if (DataContext is LoginViewModel vm)
        {
            PasswordInput.Password = vm.Password;
            if (string.IsNullOrWhiteSpace(vm.Email)) EmailInput.Focus();
            else PasswordInput.Focus();
        }
    }

    private void PasswordInput_PasswordChanged(object sender, RoutedEventArgs e)
    {
        if (DataContext is LoginViewModel vm)
            vm.Password = PasswordInput.Password;
    }

    private void Close_Click(object sender, RoutedEventArgs e) => Close();
}
