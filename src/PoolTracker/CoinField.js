export function ConfigField(props) {
  // This component is used to selecting a token and entering a value, the props are explained below:
  //      onClick - (string) => void - Called when the button is clicked
  //      symbol - string - The text displayed on the button
  //      value - string - The value of the text field
  //      onChange - (e) => void - Called when the text field changes
  //      activeField - boolean - Whether text can be entered into this field or not

  const { value, onChange, activeField, fieldName } = props;

  return (
    <div className="flex justify-between items-center flex-row w-[49%] h-20 bg-primary-black sm:p-8 p-4 rounded-2xl">
      <input
        placeholder="3"
        type="number"
        value={value}
        disabled={!activeField}
        onChange={onChange}
        className="w-full flex-1 bg-transparent outline-none font-poppins font-medium text-md text-white"
      />
      <div className="relative text-white">
        {/* <button className="flex flex-row justify-around items-center bg-secondary-gray py-2 px-4 rounded-xl font-poppins font-medium text-white">
          <span>{symbol}</span>
          <ChevronDownIcon className="ml-2 h-5 w-5 text-white transition duration-150 ease-in-out group-hover:text-opacity-80"></ChevronDownIcon>
        </button> */}
        {fieldName}
      </div>
    </div>
  );
}