using System.Windows;
using System.Windows.Input;
using System.Windows.Threading;
using PosquDesktop.ViewModels;

namespace PosquDesktop;

public partial class LoginWindow : Window
{
    public LoginWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        if (DataContext is LoginViewModel vm)
        {
            PasswordInput.Password = vm.Password ?? string.Empty;
            vm.Password = PasswordInput.Password;
        }

        // Fokus baru diberikan setelah window benar-benar aktif; kalau tidak,
        // ketikan pertama bisa hilang karena window belum menerima keyboard focus.
        Dispatcher.BeginInvoke(DispatcherPriority.Input, new Action(() =>
        {
            try
            {
                Activate();
                EmailInput.Focus();
                Keyboard.Focus(EmailInput);
                FocusManager.SetFocusedElement(this, EmailInput);

                if (EmailInput.Text.Length > 0)
                    EmailInput.SelectAll();
            }
            catch
            {
                // abaikan kegagalan fokus, user masih bisa klik field secara manual
            }
        }));
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
