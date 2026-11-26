using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;
// Adapted native-Home control helper for the UN50AU8000-class TV (Tizen 6.0, ARMv7).
//
// This is a separate reference profile from scripts/native-home/Control.cs (the LS03D /
// Tizen 9 helper). It documents the differences found on a 2021 AU8000 and the outcome of
// the experiment. It is build-reference source: the owner fills the three placeholder
// constants below from their own private configuration (kept in .local/, never committed).
//
// Differences from the Tizen 9 reference helper, all established on-device:
//  1. Runtime: the TV ships .NET Core up to 3.1 only (no .NET 6). Target netcoreapp3.1.
//  2. Home reader: libaul's aul_get_default_app is ABSENT. The app-operation-tv library
//     provides the matching reader app_operation_get_current_app, used here instead.
//  3. db/appfw/startup_appid is ABSENT on this TV; it is excluded from the managed keys so
//     restore never recreates it.
//  4. The physical Home button is governed by first-screen / overlay keys on this firmware,
//     not only home_appid + the main operation. applyfs writes all four string keys.
//
// OUTCOME: even with the main Home operation, db/appfw/home_appid, db/first_screen/type and
// db/appfw/overlay_home_appid all set to the launcher, the physical Home button still opens
// Samsung's menu. util_is_appbooting_supported_webapp_byappid returns 0 for EVERY app id on
// this firmware (including Samsung's own Home apps), i.e. native Home routing uses a protected
// platform path a public-signed web app cannot take. See docs/native-home-au8000.md.
class Control {
 const string Operation="http://tizen.org/appcontrol/operation/main";
 const string Target="<APP_ID>";                 // e.g. your launcher's application id
 const string LauncherDir="/opt/usr/apps/<PACKAGE_ID>"; // installed package directory
 const string Firmware="Version=<FIRMWARE>;";    // exact /etc/prd_info.ini Version line
 // db/appfw/startup_appid is intentionally omitted: it is absent on this TV.
 static readonly string[] Keys={"db/appfw/home_appid","db/appfw/booting_appid_backup","db/first_screen/type","db/appfw/overlay_home_appid"};
 const string AutoKey="db/menu/smart_hub/ontvsetting/auto_start";
 [DllImport("libapp-context-manager-common.so")] static extern byte util_is_appbooting_supported_webapp_byappid(string app);
 [DllImport("libcapi-appfw-app-operation-tv.so.0")] static extern int app_operation_set_current_app(string op,string app);
 [DllImport("libcapi-appfw-app-operation-tv.so.0")] static extern int app_operation_get_current_app(string op,out IntPtr app);
 [DllImport("libvconf.so.0")] static extern int vconf_set_str(string key,string value);
 [DllImport("libvconf.so.0")] static extern IntPtr vconf_get_str(string key);
 [DllImport("libvconf.so.0")] static extern int vconf_set_int(string key,int value);
 [DllImport("libvconf.so.0")] static extern int vconf_get_int(string key,out int value);
 [DllImport("libc")] static extern uint getuid();
 [DllImport("libc")] static extern void free(IntPtr ptr);
 public class Snapshot {public string Home{get;set;} public Dictionary<string,string> Strings{get;set;} public int Autostart{get;set;} public uint Uid{get;set;} public int BootSupported{get;set;}}
 static string ReadString(string key){IntPtr p=vconf_get_str(key);if(p==IntPtr.Zero)throw new Exception("Cannot read "+key);try{return Marshal.PtrToStringAnsi(p);}finally{free(p);}}
 static string Home(){IntPtr p;int rc=app_operation_get_current_app(Operation,out p);if(rc!=0||p==IntPtr.Zero)throw new Exception("Cannot read Home operation (rc="+rc+")");try{return Marshal.PtrToStringAnsi(p);}finally{free(p);}}
 static Snapshot Query(){var s=new Snapshot{Home=Home(),Strings=new Dictionary<string,string>(),Uid=getuid(),BootSupported=util_is_appbooting_supported_webapp_byappid(Target)};foreach(var k in Keys)s.Strings[k]=ReadString(k);int v;if(vconf_get_int(AutoKey,out v)!=0)throw new Exception("Cannot read autostart");s.Autostart=v;return s;}
 static void SetString(string key,string value){if(vconf_set_str(key,value)!=0||ReadString(key)!=value)throw new Exception("String write/readback failed: "+key);}
 static void SetHome(string value){if(app_operation_set_current_app(Operation,value)!=0||Home()!=value)throw new Exception("Home operation write/readback failed");}
 static void Restore(Snapshot s){SetHome(s.Home);foreach(var k in Keys)SetString(k,s.Strings[k]);}
 static void CheckSnapshot(Snapshot s){if(s==null||string.IsNullOrWhiteSpace(s.Home)||s.Strings==null||s.Strings.Count!=Keys.Length)throw new Exception("Invalid original snapshot");foreach(var k in Keys)if(!s.Strings.ContainsKey(k)||string.IsNullOrWhiteSpace(s.Strings[k]))throw new Exception("Missing original setting: "+k);}
 static int Main(string[] args){
  try{
   if(IntPtr.Size!=4||getuid()!=901)throw new Exception("Expected 32-bit SDK user, no root");
   var info=File.ReadAllText("/etc/prd_info.ini");if(!info.Contains(Firmware))throw new Exception("Unexpected firmware");
   // Diagnostic: report app-booting eligibility for any app id (returns 0 for all apps here).
   if(args.Length==2&&args[0]=="eligible"){Console.WriteLine("ELIGIBLE["+args[1]+"]="+util_is_appbooting_supported_webapp_byappid(args[1]));return 0;}
   if(args.Length==1&&args[0]=="query"){Console.WriteLine("CLEANFRAME_HOME_JSON="+JsonSerializer.Serialize(Query()));return 0;}
   if(args.Length!=2||(args[0]!="applyhome"&&args[0]!="applyfs"&&args[0]!="restore"))throw new Exception("Use query, eligible APPID, applyhome|applyfs|restore SNAPSHOT");
   var original=JsonSerializer.Deserialize<Snapshot>(File.ReadAllText(args[1]));CheckSnapshot(original);var before=Query();
   if(before.Home!=original.Home&&before.Home!=Target)throw new Exception("Home changed since snapshot; stop for review");
   if(args[0]=="restore"){Restore(original);Console.WriteLine("CLEANFRAME_HOME_RESTORED="+JsonSerializer.Serialize(Query()));return 0;}
   if(before.Home!=original.Home)throw new Exception("Configuration changed since snapshot");
   // applyhome sets only the Home operation + home_appid; applyfs also sets the first-screen
   // and overlay-home keys that drive the physical Home button on this firmware generation.
   try{
    SetHome(Target);SetString("db/appfw/home_appid",Target);
    if(args[0]=="applyfs"){SetString("db/first_screen/type",Target);SetString("db/appfw/overlay_home_appid",Target);}
    Console.WriteLine("CLEANFRAME_HOME_APPLIED="+JsonSerializer.Serialize(Query()));
   }catch{Restore(original);Console.Error.WriteLine("Original Home values restored after a failed apply");throw;}
   return 0;
  }catch(Exception e){Console.Error.WriteLine(e.ToString());return 1;}
 }
}
